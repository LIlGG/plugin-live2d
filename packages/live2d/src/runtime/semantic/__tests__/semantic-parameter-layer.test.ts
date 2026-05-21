import { describe, expect, it } from "vitest";
import { SemanticParameterLayer } from "../semantic-parameter-layer";

// Mock Cubism 2 (Legacy) core model
function createCubism2MockModel(
  paramIds: string[],
): object {
  const params = new Map<string, number>();
  for (const id of paramIds) {
    params.set(id, 0);
  }

  return {
    getParamFloat(id: string | number): number {
      if (typeof id === "number") {
        return Array.from(params.values())[id] ?? 0;
      }
      return params.get(id) ?? 0;
    },
    setParamFloat(id: string | number, value: number): void {
      if (typeof id === "number") {
        const key = Array.from(params.keys())[id];
        if (key) params.set(key, value);
      } else {
        params.set(id, value);
      }
    },
    getParamIndex(id: string): number {
      const keys = Array.from(params.keys());
      return keys.indexOf(id);
    },
  };
}

// Mock Cubism 4/5 core model
function createCubism4MockModel(
  paramIds: string[],
): object {
  const values = new Float32Array(paramIds.length);
  const minimumValues = new Float32Array(paramIds.length).fill(-30);
  const maximumValues = new Float32Array(paramIds.length).fill(30);
  const defaultValues = new Float32Array(paramIds.length);

  return {
    _model: {
      parameters: {
        ids: paramIds,
        values,
        minimumValues,
        maximumValues,
        defaultValues,
      },
    },
    getParameterValueByIndex(index: number): number {
      return values[index] ?? 0;
    },
    setParameterValueByIndex(index: number, value: number): void {
      if (index >= 0 && index < values.length) {
        values[index] = value;
      }
    },
  };
}

// Wrap core model in internalModel like untitled-pixi-live2d-engine does
function wrapModel(coreModel: object): object {
  return { internalModel: { coreModel } };
}

describe("SemanticParameterLayer", () => {
  describe("Cubism 2 model detection", () => {
    it("resolves mouthOpen for Cubism 2 model (PARAM_MOUTH_OPEN_Y)", () => {
      const layer = new SemanticParameterLayer();
      const core = createCubism2MockModel([
        "PARAM_MOUTH_OPEN_Y",
        "PARAM_ANGLE_X",
        "PARAM_EYE_L_OPEN",
      ]);
      const profile = layer.detectFromModel(wrapModel(core));

      expect(profile.detected.has("mouthOpen")).toBe(true);
      expect(profile.detected.get("mouthOpen")).toBe("PARAM_MOUTH_OPEN_Y");
      expect(layer.hasSemantic("mouthOpen")).toBe(true);
    });

    it("reports missing parameters", () => {
      const layer = new SemanticParameterLayer();
      const core = createCubism2MockModel(["PARAM_ANGLE_X"]);
      const profile = layer.detectFromModel(wrapModel(core));

      expect(profile.detected.has("angleX")).toBe(true);
      expect(profile.missing).toContain("mouthOpen");
      expect(profile.missing).toContain("eyeLOpen");
    });
  });

  describe("Cubism 4/5 model detection", () => {
    it("resolves mouthOpen for Cubism 4/5 model (PARAM_MOUTH_A)", () => {
      const layer = new SemanticParameterLayer();
      const core = createCubism4MockModel([
        "PARAM_MOUTH_A",
        "PARAM_ANGLE_X",
        "PARAM_EYE_L_OPEN",
      ]);
      const profile = layer.detectFromModel(wrapModel(core));

      expect(profile.detected.has("mouthOpen")).toBe(true);
      expect(profile.detected.get("mouthOpen")).toBe("PARAM_MOUTH_A");
      expect(layer.hasSemantic("mouthOpen")).toBe(true);
    });

    it("resolves multiple semantics correctly", () => {
      const layer = new SemanticParameterLayer();
      const core = createCubism4MockModel([
        "ParamAngleX",
        "ParamEyeBallX",
        "ParamBreath",
        "ParamEyeLOpen",
        "ParamEyeROpen",
      ]);
      const profile = layer.detectFromModel(wrapModel(core));

      expect(profile.detected.has("angleX")).toBe(true);
      expect(profile.detected.has("eyeBallX")).toBe(true);
      expect(profile.detected.has("breath")).toBe(true);
      expect(profile.detected.has("eyeLOpen")).toBe(true);
      expect(profile.detected.has("eyeROpen")).toBe(true);
    });
  });

  describe("setSemantic", () => {
    it("override mode replaces parameter value", () => {
      const layer = new SemanticParameterLayer();
      const core = createCubism4MockModel(["PARAM_ANGLE_X"]);
      layer.detectFromModel(wrapModel(core));

      layer.setSemantic("angleX", 15, "override");
      expect(layer.getSemantic("angleX")).toBe(15);

      layer.setSemantic("angleX", -10, "override");
      expect(layer.getSemantic("angleX")).toBe(-10);
    });

    it("add mode adds to parameter value", () => {
      const layer = new SemanticParameterLayer();
      const core = createCubism4MockModel(["PARAM_ANGLE_X"]);
      layer.detectFromModel(wrapModel(core));

      layer.setSemantic("angleX", 10, "override");
      expect(layer.getSemantic("angleX")).toBe(10);

      layer.setSemantic("angleX", 5, "add");
      expect(layer.getSemantic("angleX")).toBe(15);
    });

    it("clamps out-of-bounds values", () => {
      const layer = new SemanticParameterLayer();
      const core = createCubism4MockModel(["PARAM_ANGLE_X"]);
      layer.detectFromModel(wrapModel(core));

      layer.setSemantic("angleX", 100, "override");
      expect(layer.getSemantic("angleX")).toBe(30); // clamped to max

      layer.setSemantic("angleX", -100, "override");
      expect(layer.getSemantic("angleX")).toBe(-30); // clamped to min
    });

    it("silently ignores unmapped semantic", () => {
      const layer = new SemanticParameterLayer();
      const core = createCubism4MockModel(["PARAM_ANGLE_X"]);
      layer.detectFromModel(wrapModel(core));

      // Should not throw
      layer.setSemantic("nonExistent", 10);
      expect(layer.getSemantic("nonExistent")).toBeUndefined();
    });
  });

  describe("registerSemantic", () => {
    it("adds custom mapping before detection", () => {
      const layer = new SemanticParameterLayer();
      layer.registerSemantic("customEar", ["PARAM_EAR_WIGGLE", "CUSTOM_EAR"]);

      const core = createCubism4MockModel([
        "PARAM_ANGLE_X",
        "CUSTOM_EAR",
      ]);
      const profile = layer.detectFromModel(wrapModel(core));

      expect(profile.detected.has("customEar")).toBe(true);
      expect(profile.detected.get("customEar")).toBe("CUSTOM_EAR");
    });

    it("custom mapping overrides default", () => {
      const layer = new SemanticParameterLayer();
      layer.registerSemantic("mouthOpen", ["CUSTOM_MOUTH"]);

      const core = createCubism4MockModel([
        "PARAM_MOUTH_A",
        "CUSTOM_MOUTH",
      ]);
      const profile = layer.detectFromModel(wrapModel(core));

      // Should resolve to CUSTOM_MOUTH because custom mapping takes precedence
      expect(profile.detected.get("mouthOpen")).toBe("CUSTOM_MOUTH");
    });
  });

  describe("CapabilityProfile", () => {
    it("correctly categorizes detected and missing parameters", () => {
      const layer = new SemanticParameterLayer();
      const core = createCubism4MockModel([
        "PARAM_MOUTH_A",
        "PARAM_ANGLE_X",
      ]);
      const profile = layer.detectFromModel(wrapModel(core));

      expect(profile.detected.size).toBe(2);
      expect(profile.detected.has("mouthOpen")).toBe(true);
      expect(profile.detected.has("angleX")).toBe(true);
      expect(profile.missing.length).toBeGreaterThan(0);
      expect(profile.missing).toContain("eyeLOpen");
    });

    it("is accessible via getCapabilityProfile", () => {
      const layer = new SemanticParameterLayer();
      const core = createCubism4MockModel(["PARAM_ANGLE_X"]);
      layer.detectFromModel(wrapModel(core));

      const profile = layer.getCapabilityProfile();
      expect(profile.detected.has("angleX")).toBe(true);
    });
  });

  describe("hit area lookup", () => {
    function createModelWithHitAreas(
      hitAreas: Record<string, { name: string; index: number }>,
    ): object {
      return {
        internalModel: {
          coreModel: {
            _model: {
              parameters: { ids: [], values: [], minimumValues: [], maximumValues: [], defaultValues: [] },
            },
            getParameterValueByIndex: () => 0,
            setParameterValueByIndex: () => {},
          },
          hitAreas,
          getDrawableBounds: (index: number) => {
            return { x: 0, y: index * 10, width: 50, height: 50 };
          },
        },
      };
    }

    it("finds hit area index by name pattern", () => {
      const layer = new SemanticParameterLayer();
      const model = createModelWithHitAreas({
        head: { name: "Head", index: 5 },
        body: { name: "Body", index: 3 },
      });
      layer.detectFromModel(model);

      const index = layer.getHitAreaIndex(/head/i);
      expect(index).toBe(5);
    });

    it("returns undefined when no hit area matches", () => {
      const layer = new SemanticParameterLayer();
      const model = createModelWithHitAreas({
        body: { name: "Body", index: 3 },
      });
      layer.detectFromModel(model);

      const index = layer.getHitAreaIndex(/head/i);
      expect(index).toBeUndefined();
    });

    it("returns undefined when model has no hitAreas", () => {
      const layer = new SemanticParameterLayer();
      const model = {
        internalModel: {
          coreModel: {
            _model: {
              parameters: { ids: [], values: [], minimumValues: [], maximumValues: [], defaultValues: [] },
            },
            getParameterValueByIndex: () => 0,
            setParameterValueByIndex: () => {},
          },
        },
      };
      layer.detectFromModel(model);

      const index = layer.getHitAreaIndex(/head/i);
      expect(index).toBeUndefined();
    });

    it("gets drawable bounds by index", () => {
      const layer = new SemanticParameterLayer();
      const model = createModelWithHitAreas({
        head: { name: "Head", index: 5 },
      });
      layer.detectFromModel(model);

      const bounds = layer.getDrawableBounds(5);
      expect(bounds).toEqual({ x: 0, y: 50, width: 50, height: 50 });
    });

    it("returns null for invalid drawable bounds", () => {
      const layer = new SemanticParameterLayer();
      const model = {
        internalModel: {
          coreModel: {
            _model: {
              parameters: { ids: [], values: [], minimumValues: [], maximumValues: [], defaultValues: [] },
            },
            getParameterValueByIndex: () => 0,
            setParameterValueByIndex: () => {},
          },
          getDrawableBounds: () => ({ x: NaN, y: NaN, width: 0, height: 0 }),
        },
      };
      layer.detectFromModel(model);

      const bounds = layer.getDrawableBounds(0);
      expect(bounds).toBeNull();
    });
  });
});
