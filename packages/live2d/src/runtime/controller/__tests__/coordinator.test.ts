import { describe, expect, it, vi, beforeEach } from "vitest";
import { ParameterCoordinator } from "../coordinator";
import { SemanticParameterLayer } from "../../semantic";
import { EmotionTimeline } from "../../emotion/timeline";
import { ProceduralAnimator } from "../../procedural/animator";
import { MutableParameterSet } from "../../procedural/parameter-set";
import { SystemPriority } from "../types";

function createMockSemanticLayer(): SemanticParameterLayer {
  const layer = new SemanticParameterLayer();
  (layer as unknown as Record<string, unknown>).resolved = new Map([
    ["mouthOpen", { id: "PARAM_MOUTH_OPEN", index: 0 }],
    ["angleX", { id: "PARAM_ANGLE_X", index: 1 }],
    ["eyeLOpen", { id: "PARAM_EYE_L_OPEN", index: 2 }],
  ]);
  // Stateful, like the real accessor: `add` writes read the value back.
  const values = new Float32Array(3);
  const setValueMock = vi.fn((index: number, value: number) => {
    values[index] = value;
  });
  (layer as unknown as Record<string, unknown>).accessor = {
    getValue: (index: number) => values[index],
    setValue: setValueMock,
    getMin: () => -30,
    getMax: () => 30,
  };
  return layer;
}

function getAccessor(layer: SemanticParameterLayer): { setValue: ReturnType<typeof vi.fn> } {
  return (layer as unknown as Record<string, unknown>).accessor as { setValue: ReturnType<typeof vi.fn> };
}

describe("ParameterCoordinator", () => {
  let semanticLayer: SemanticParameterLayer;
  let coordinator: ParameterCoordinator;

  beforeEach(() => {
    semanticLayer = createMockSemanticLayer();
    coordinator = new ParameterCoordinator(semanticLayer);
    semanticLayer.setCoordinator(coordinator);
  });

  describe("queueWrite", () => {
    it("collects writes per parameter", () => {
      coordinator.queueWrite("mouthOpen", 0.5, "override", "fsm", SystemPriority.FSM);
      coordinator.queueWrite("mouthOpen", 0.8, "override", "emotion", SystemPriority.EMOTION);

      // Before flush, accessor should not be called
      const accessor = getAccessor(semanticLayer);
      expect(accessor.setValue).not.toHaveBeenCalled();
    });

    it("applies single write on flush", () => {
      coordinator.queueWrite("mouthOpen", 0.5, "override", "fsm", SystemPriority.FSM);
      coordinator.flush();

      const accessor = getAccessor(semanticLayer);
      expect(accessor.setValue).toHaveBeenCalledWith(0, 0.5);
    });
  });

  describe("conflict detection", () => {
    it("logs conflict when two override sources write same parameter", () => {
      coordinator.queueWrite("mouthOpen", 0.5, "override", "fsm", SystemPriority.FSM);
      coordinator.queueWrite("mouthOpen", 0.8, "override", "emotion", SystemPriority.EMOTION);
      coordinator.flush();

      const log = coordinator.getConflictLog();
      expect(log.length).toBe(1);
      expect(log[0].parameter).toBe("mouthOpen");
      expect(log[0].winningSystem).toBe("fsm");
      expect(log[0].losingSystem).toBe("emotion");
      expect(log[0].winningValue).toBe(0.5);
      expect(log[0].losingValue).toBe(0.8);
    });

    it("highest priority wins (lowest number)", () => {
      // MANUAL=1 should win over all others
      coordinator.queueWrite("mouthOpen", 0.9, "override", "manual", SystemPriority.MANUAL);
      coordinator.queueWrite("mouthOpen", 0.5, "override", "fsm", SystemPriority.FSM);
      coordinator.queueWrite("mouthOpen", 0.3, "override", "emotion", SystemPriority.EMOTION);
      coordinator.flush();

      const accessor = getAccessor(semanticLayer);
      expect(accessor.setValue).toHaveBeenCalledWith(0, 0.9);

      const log = coordinator.getConflictLog();
      // Two conflicts: manual wins over fsm, manual wins over emotion
      expect(log.length).toBe(2);
      expect(log[0].winningSystem).toBe("manual");
      expect(log[1].winningSystem).toBe("manual");
    });

    it("does not log conflict for single source", () => {
      coordinator.queueWrite("mouthOpen", 0.5, "override", "fsm", SystemPriority.FSM);
      coordinator.flush();

      expect(coordinator.getConflictLog()).toEqual([]);
    });

    it("keeps the first override when priorities are equal", () => {
      coordinator.queueWrite("mouthOpen", 0.5, "override", "first", SystemPriority.FSM);
      coordinator.queueWrite("mouthOpen", 0.8, "override", "second", SystemPriority.FSM);
      coordinator.flush();

      const accessor = getAccessor(semanticLayer);
      expect(accessor.setValue).toHaveBeenCalledWith(0, 0.5);
      expect(coordinator.getConflictLog()[0].winningSystem).toBe("first");
      expect(coordinator.getConflictLog()[0].losingSystem).toBe("second");
    });

    it("does not log conflict for add blend mode", () => {
      coordinator.queueWrite("mouthOpen", 0.5, "add", "fsm", SystemPriority.FSM);
      coordinator.queueWrite("mouthOpen", 0.3, "add", "emotion", SystemPriority.EMOTION);
      coordinator.flush();

      // Add writes don't conflict, they accumulate
      expect(coordinator.getConflictLog()).toEqual([]);

      const accessor = getAccessor(semanticLayer);
      expect(accessor.setValue).toHaveBeenCalledWith(0, 0.8); // 0.5 + 0.3
    });

    it("combines override and add correctly", () => {
      coordinator.queueWrite("mouthOpen", 0.5, "override", "fsm", SystemPriority.FSM);
      coordinator.queueWrite("mouthOpen", 0.2, "add", "procedural", SystemPriority.PROCEDURAL);
      coordinator.flush();

      // Override wins, then add is added to it
      const accessor = getAccessor(semanticLayer);
      expect(accessor.setValue).toHaveBeenCalledWith(0, 0.7); // 0.5 + 0.2
    });

    it("add-only resolves to sum without override", () => {
      coordinator.queueWrite("mouthOpen", 0.3, "add", "procedural", SystemPriority.PROCEDURAL);
      coordinator.queueWrite("mouthOpen", 0.4, "add", "motion", SystemPriority.MOTION);
      coordinator.flush();

      const accessor = getAccessor(semanticLayer);
      expect(accessor.setValue).toHaveBeenCalledWith(0, 0.7);
    });
  });

  describe("conflict log management", () => {
    it("trims log to max size", () => {
      const smallCoordinator = new ParameterCoordinator(semanticLayer, { maxLogSize: 3 });
      semanticLayer.setCoordinator(smallCoordinator);

      for (let i = 0; i < 5; i++) {
        smallCoordinator.queueWrite("mouthOpen", i * 0.1, "override", `fsm-${i}`, SystemPriority.FSM);
      }
      smallCoordinator.flush();

      const log = smallCoordinator.getConflictLog();
      expect(log.length).toBe(3);
    });

    it("clears log on request", () => {
      coordinator.queueWrite("mouthOpen", 0.5, "override", "fsm", SystemPriority.FSM);
      coordinator.queueWrite("mouthOpen", 0.8, "override", "emotion", SystemPriority.EMOTION);
      coordinator.flush();

      expect(coordinator.getConflictLog().length).toBe(1);

      coordinator.clearConflictLog();
      expect(coordinator.getConflictLog()).toEqual([]);
    });

    it("returns a copy of the log", () => {
      coordinator.queueWrite("mouthOpen", 0.5, "override", "fsm", SystemPriority.FSM);
      coordinator.queueWrite("mouthOpen", 0.8, "override", "emotion", SystemPriority.EMOTION);
      coordinator.flush();

      const log1 = coordinator.getConflictLog();
      log1.push({} as never);
      const log2 = coordinator.getConflictLog();
      expect(log2.length).toBe(1); // Original log unchanged
    });
  });

  describe("per-frame isolation", () => {
    it("clears the queue after flush", () => {
      coordinator.queueWrite("mouthOpen", 0.5, "override", "fsm", SystemPriority.FSM);
      coordinator.flush();

      const accessor = getAccessor(semanticLayer);
      const callCount = accessor.setValue.mock.calls.length;

      // Second flush should not apply anything new
      coordinator.flush();
      expect(accessor.setValue).toHaveBeenCalledTimes(callCount);
    });

    it("handles multiple parameters independently", () => {
      coordinator.queueWrite("mouthOpen", 0.5, "override", "fsm", SystemPriority.FSM);
      coordinator.queueWrite("angleX", 10, "override", "emotion", SystemPriority.EMOTION);
      coordinator.flush();

      const accessor = getAccessor(semanticLayer);
      expect(accessor.setValue).toHaveBeenCalledWith(0, 0.5);
      expect(accessor.setValue).toHaveBeenCalledWith(1, 10);
    });
  });

  describe("engine parameter lifecycle", () => {
    /**
     * Stateful mock reproducing the engine's parameter lifecycle, in the order
     * `CubismInternalModel.update` / `CubismLegacyInternalModel.update` run it:
     *
     *   motions → saveParameters → engine auto-updates → beforeModelUpdate
     *     → model.update() → loadParameters
     *
     * `rendered` is the value the model is drawn with, `baseline` the value the
     * engine keeps for the next frame.
     */
    function createEngineRig(
      options: {
        /** Parameters the engine itself wrote this frame, before its baseline. */
        engineWrite?: Record<string, number>;
        /** Parameters the engine adds on top after its baseline (breath, focus). */
        engineAdds?: Record<string, number>;
      } = {},
    ) {
      const ids = ["PARAM_ANGLE_X", "PARAM_BREATH"];
      const values = new Float32Array(ids.length);
      const baseline = new Float32Array(ids.length);
      const rendered = new Float32Array(ids.length);
      const minimums = new Float32Array([-30, 0]);
      const maximums = new Float32Array([30, 1]);

      const layer = new SemanticParameterLayer();
      (layer as unknown as Record<string, unknown>).resolved = new Map([
        ["angleX", { id: ids[0], index: 0 }],
        ["breath", { id: ids[1], index: 1 }],
      ]);
      const setValueCalls: Array<[number, number]> = [];
      (layer as unknown as Record<string, unknown>).accessor = {
        getValue: (index: number) => values[index],
        setValue: (index: number, value: number) => {
          setValueCalls.push([index, value]);
          // Same as setParameterValueByIndex(index, value) with weight 1.
          values[index] = value;
        },
        getMin: (index: number) => minimums[index],
        getMax: (index: number) => maximums[index],
      };

      const coordinator = new ParameterCoordinator(layer);
      layer.setCoordinator(coordinator);

      /** One engine frame: motions → save → auto-updates → flush → render → restore. */
      const engineFrame = () => {
        for (const [id, value] of Object.entries(options.engineWrite ?? {})) {
          values[ids.indexOf(id)] = value;
        }

        // saveParameters()
        baseline.set(values);

        // The engine's own per-frame writes (breath, focus, physics, pose).
        for (const [id, value] of Object.entries(options.engineAdds ?? {})) {
          const index = ids.indexOf(id);
          values[index] = Math.max(
            minimums[index],
            Math.min(maximums[index], values[index] + value),
          );
        }

        // beforeModelUpdate: our writes are visible in this frame only.
        coordinator.flush();
        layer.captureRenderedValues();
        rendered.set(values);

        // loadParameters()
        values.set(baseline);
      };

      /** One plugin frame: run the engine, then queue the next write. */
      const frame = (addValue: number | null) => {
        engineFrame();
        if (addValue !== null) {
          coordinator.queueWrite(
            "angleX",
            addValue,
            "add",
            "procedural",
            SystemPriority.PROCEDURAL,
          );
        }
      };

      return {
        coordinator,
        layer,
        frame,
        engineFrame,
        /** Value the model was last rendered with. */
        angleX: () => rendered[0],
        /** Value the engine keeps for the next frame. */
        baselineAngleX: () => baseline[0],
        setValueCalls,
      };
    }

    it("does not accumulate add writes across frames", () => {
      const rig = createEngineRig();
      for (let i = 0; i < 20; i++) rig.frame(15);

      // 15 per frame on top of the engine's value, not 15 * 20 clamped to 30.
      expect(rig.angleX()).toBe(15);
      // The engine drops the contribution when it restores its baseline.
      expect(rig.baselineAngleX()).toBe(0);
    });

    it("adds on top of a parameter the engine writes itself", () => {
      const rig = createEngineRig({ engineWrite: { PARAM_ANGLE_X: 5 } });
      for (let i = 0; i < 20; i++) rig.frame(15);

      // engine 5 + our 15, stable instead of drifting upwards.
      expect(rig.angleX()).toBe(20);
      expect(rig.baselineAngleX()).toBe(5);
    });

    it("adds on top of the engine's own per-frame writes", () => {
      const rig = createEngineRig({ engineAdds: { PARAM_ANGLE_X: 3 } });
      for (let i = 0; i < 20; i++) rig.frame(15);

      // The engine's own contribution runs before `beforeModelUpdate`, so the
      // add lands on top of it; the baseline still only holds the engine value.
      expect(rig.angleX()).toBe(18);
      expect(rig.baselineAngleX()).toBe(0);
    });

    it("releases the contribution once the writer stops", () => {
      const rig = createEngineRig();
      for (let i = 0; i < 10; i++) rig.frame(15);
      expect(rig.angleX()).toBe(15);

      rig.frame(null);
      // The add queued by the previous frame is applied once more...
      expect(rig.angleX()).toBe(15);
      // ...and gone on the frame after, since the engine restored its baseline.
      rig.frame(null);
      expect(rig.angleX()).toBe(0);
    });

    it("keeps float32 values stable instead of drifting", () => {
      const rig = createEngineRig();
      for (let i = 0; i < 30; i++) rig.frame(0.1);

      expect(rig.angleX()).toBeCloseTo(0.1, 6);
    });

    it("stacks add contributions on top of an override", () => {
      const rig = createEngineRig();
      rig.coordinator.queueWrite("angleX", 5, "override", "emotion", SystemPriority.EMOTION);
      rig.coordinator.queueWrite("angleX", 2, "add", "procedural", SystemPriority.PROCEDURAL);

      rig.engineFrame();

      expect(rig.angleX()).toBe(7);
    });

    it("lets an override take the parameter over without leaving add residue", () => {
      const rig = createEngineRig();
      for (let i = 0; i < 5; i++) rig.frame(15);
      rig.frame(null); // apply the add queued by the previous frame
      expect(rig.angleX()).toBe(15);

      rig.coordinator.queueWrite("angleX", 5, "override", "emotion", SystemPriority.EMOTION);
      rig.engineFrame();
      expect(rig.angleX()).toBe(5);

      // Next frame the engine's own value is back: the add contribution was not
      // left behind anywhere.
      rig.engineFrame();
      expect(rig.angleX()).toBe(0);
    });

    it("keeps an override for one frame only unless it is written again", () => {
      // A queued override is applied to the frame it was queued in. It does not
      // reach the engine's baseline, so a caller that wants it to hold has to
      // queue it every frame - or use holdOverride(), which does that for it.
      const rig = createEngineRig();
      rig.coordinator.queueWrite("angleX", 5, "override", "manual", SystemPriority.MANUAL);

      rig.engineFrame();
      expect(rig.angleX()).toBe(5);
      expect(rig.baselineAngleX()).toBe(0);

      rig.engineFrame();
      expect(rig.angleX()).toBe(0);
    });

    it("keeps a completed direct emotion through later engine frames", () => {
      const rig = createEngineRig();
      const now = vi.spyOn(performance, "now").mockReturnValue(0);
      try {
        const timeline = new EmotionTimeline(
          { semanticLayer: rig.layer },
          { defaultDuration: 100, minDuration: 0, defaultEasing: "linear" },
        );
        timeline.registerEmotion("pose", { parameters: { angleX: 5 } });
        timeline.transitionTo("pose");
        now.mockReturnValue(100);
        timeline.update();

        rig.engineFrame();
        expect(rig.angleX()).toBe(5);
        rig.engineFrame();
        expect(rig.angleX()).toBe(5);
        expect(rig.baselineAngleX()).toBe(0);

        timeline.destroy();
        rig.engineFrame();
        expect(rig.angleX()).toBe(0);
      } finally {
        now.mockRestore();
      }
    });

    it("keeps a completed animation and lets a new animation take over", () => {
      const rig = createEngineRig();
      const animator = new ProceduralAnimator(rig.layer);
      const params = new MutableParameterSet();
      const queueOutputs = () => {
        params.forEach((name, value, blendMode) => {
          rig.layer.setSemantic(name, value, blendMode, "procedural", SystemPriority.PROCEDURAL);
        });
      };

      void animator.animate({ target: "angleX", to: 5, duration: 100, easing: (t) => t });
      animator.update(100, params);
      queueOutputs();
      rig.engineFrame();
      expect(rig.angleX()).toBe(5);
      rig.engineFrame();
      expect(rig.angleX()).toBe(5);

      void animator.animate({ target: "angleX", to: 10, duration: 100, easing: (t) => t });
      params.clear();
      animator.update(50, params);
      queueOutputs();
      rig.engineFrame();
      expect(rig.angleX()).toBe(7.5);
      animator.releaseHeldTargets();
    });

    it("reset() drops pending writes", () => {
      const rig = createEngineRig();
      for (let i = 0; i < 5; i++) rig.frame(15);
      rig.coordinator.queueWrite("angleX", 25, "add", "procedural", SystemPriority.PROCEDURAL);
      rig.coordinator.queueWrite("angleX", 25, "override", "manual", SystemPriority.MANUAL);

      rig.coordinator.reset();
      const callsBefore = rig.setValueCalls.length;
      rig.engineFrame();

      expect(rig.setValueCalls.length).toBe(callsBefore);
    });

    it("re-applies a held override on every frame", () => {
      const rig = createEngineRig();
      rig.coordinator.holdOverride("angleX", 5, "manual", SystemPriority.MANUAL);

      for (let i = 0; i < 3; i++) {
        rig.engineFrame();
        expect(rig.angleX()).toBe(5);
      }

      // The hold is re-applied per frame, it never reaches the engine's
      // baseline.
      expect(rig.baselineAngleX()).toBe(0);
    });

    it("keeps a held override against a lower-priority per-frame override", () => {
      const rig = createEngineRig();
      rig.coordinator.holdOverride("angleX", 5, "manual", SystemPriority.MANUAL);

      for (let i = 0; i < 3; i++) {
        rig.coordinator.queueWrite(
          "angleX",
          1,
          "override",
          "procedural",
          SystemPriority.PROCEDURAL,
        );
        rig.engineFrame();
        expect(rig.angleX()).toBe(5);
      }

      // A continuing held-vs-queued conflict is reported once, not per frame.
      expect(rig.coordinator.getConflictLog()).toEqual([
        expect.objectContaining({ winningSystem: "manual", losingSystem: "procedural" }),
      ]);
    });

    it("preserves queued conflict diagnostics when a hold wins", () => {
      const rig = createEngineRig();
      rig.coordinator.holdOverride("angleX", 5, "manual", SystemPriority.MANUAL);
      rig.coordinator.queueWrite("angleX", 3, "override", "emotion", SystemPriority.EMOTION);
      rig.coordinator.queueWrite("angleX", 2, "override", "motion", SystemPriority.MOTION);
      rig.engineFrame();

      expect(rig.angleX()).toBe(5);
      const log = rig.coordinator.getConflictLog();
      expect(log).toEqual([
        expect.objectContaining({ winningSystem: "emotion", losingSystem: "motion" }),
        expect.objectContaining({ winningSystem: "manual", losingSystem: "emotion" }),
        expect.objectContaining({ winningSystem: "manual", losingSystem: "motion" }),
      ]);

      rig.coordinator.queueWrite("angleX", 3, "override", "emotion", SystemPriority.EMOTION);
      rig.coordinator.queueWrite("angleX", 2, "override", "motion", SystemPriority.MOTION);
      rig.engineFrame();
      expect(rig.coordinator.getConflictLog()).toHaveLength(4);
    });

    it("reports a held loser once when a higher-priority queue wins", () => {
      const rig = createEngineRig();
      rig.coordinator.holdOverride("angleX", 5, "fsm", SystemPriority.FSM);
      for (let frame = 0; frame < 3; frame++) {
        rig.coordinator.queueWrite("angleX", 9, "override", "manual", SystemPriority.MANUAL);
        rig.engineFrame();
        expect(rig.angleX()).toBe(9);
      }

      expect(rig.coordinator.getConflictLog()).toEqual([
        expect.objectContaining({ winningSystem: "manual", losingSystem: "fsm" }),
      ]);
    });

    it("keeps an established hold over a same-source queued override on a priority tie", () => {
      const rig = createEngineRig();
      rig.coordinator.holdOverride("angleX", 5, "manual", SystemPriority.MANUAL);
      rig.coordinator.queueWrite("angleX", 9, "override", "manual", SystemPriority.MANUAL);

      rig.engineFrame();

      expect(rig.angleX()).toBe(5);
    });

    it("stacks add contributions on top of a held override", () => {
      const rig = createEngineRig();
      rig.coordinator.holdOverride("angleX", 5, "manual", SystemPriority.MANUAL);

      for (let i = 0; i < 3; i++) {
        rig.coordinator.queueWrite(
          "angleX",
          2,
          "add",
          "procedural",
          SystemPriority.PROCEDURAL,
        );
        rig.engineFrame();
        expect(rig.angleX()).toBe(7);
      }
    });

    it("keeps an FSM additive contribution for every frame and releases it", () => {
      const rig = createEngineRig({ engineWrite: { PARAM_ANGLE_X: 3 } });
      rig.coordinator.holdWrite("angleX", 5, "add", "fsm", SystemPriority.FSM);

      for (let i = 0; i < 3; i++) {
        rig.engineFrame();
        expect(rig.angleX()).toBe(8);
        expect(rig.layer.getRenderedSemantic("angleX")).toBe(8);
        expect(rig.layer.getSemantic("angleX")).toBe(3);
      }

      rig.coordinator.releaseOverride("angleX", "fsm");
      rig.engineFrame();
      expect(rig.angleX()).toBe(3);
    });

    it("restores the FSM hold after a manual hold is released", () => {
      const rig = createEngineRig();
      rig.coordinator.holdOverride("angleX", 5, "fsm", SystemPriority.FSM);
      rig.coordinator.holdOverride("angleX", 10, "manual", SystemPriority.MANUAL);
      rig.engineFrame();
      expect(rig.angleX()).toBe(10);
      expect(rig.coordinator.getHeldValue("angleX", "manual")).toBe(10);
      expect(rig.coordinator.getHeldValue("angleX", "fsm")).toBe(5);
      expect(rig.coordinator.getConflictLog()[0].winningSystem).toBe("manual");
      expect(rig.coordinator.getConflictLog()[0].losingSystem).toBe("fsm");

      rig.coordinator.releaseOverride("angleX", "manual");
      rig.engineFrame();
      expect(rig.angleX()).toBe(5);
      expect(rig.coordinator.getHeldValue("angleX", "manual")).toBeUndefined();
    });

    it("keeps a lower-priority hold registered while manual control is active", () => {
      const rig = createEngineRig();
      rig.coordinator.holdOverride("angleX", 10, "manual", SystemPriority.MANUAL);
      rig.coordinator.holdOverride("angleX", 5, "fsm", SystemPriority.FSM);
      rig.engineFrame();
      expect(rig.angleX()).toBe(10);

      rig.coordinator.releaseOverride("angleX", "manual");
      rig.engineFrame();
      expect(rig.angleX()).toBe(5);
    });

    it("reports the clamped rendered value instead of the hold target", () => {
      const rig = createEngineRig();
      rig.coordinator.holdOverride("angleX", 25, "manual", SystemPriority.MANUAL);
      rig.coordinator.queueWrite("angleX", 10, "add", "procedural", SystemPriority.PROCEDURAL);
      rig.engineFrame();

      expect(rig.angleX()).toBe(30);
      expect(rig.layer.getRenderedSemantic("angleX")).toBe(30);
      expect(rig.layer.getSemantic("angleX")).toBe(0);
    });

    it("snapshots engine-only parameter changes even when the plugin has no writes", () => {
      const rig = createEngineRig({ engineAdds: { PARAM_ANGLE_X: 3 } });
      rig.engineFrame();

      expect(rig.layer.getRenderedSemantic("angleX")).toBe(3);
      expect(rig.layer.getSemantic("angleX")).toBe(0);
    });

    it("releases a held override back to the engine", () => {
      const rig = createEngineRig();
      rig.coordinator.holdOverride("angleX", 5, "manual", SystemPriority.MANUAL);
      rig.engineFrame();
      expect(rig.angleX()).toBe(5);

      rig.coordinator.releaseOverride("angleX", "manual");
      rig.engineFrame();
      expect(rig.angleX()).toBe(0);
    });

    it("does not let a lower-priority hold replace a higher-priority one", () => {
      const rig = createEngineRig();
      rig.coordinator.holdOverride("angleX", 5, "manual", SystemPriority.MANUAL);
      rig.coordinator.holdOverride("angleX", 9, "fsm", SystemPriority.FSM);

      rig.engineFrame();
      expect(rig.angleX()).toBe(5);

      const log = rig.coordinator.getConflictLog();
      expect(log).toHaveLength(1);
      expect(log[0].winningSystem).toBe("manual");
      expect(log[0].losingSystem).toBe("fsm");
    });

    it("releaseOverride ignores a different source", () => {
      const rig = createEngineRig();
      rig.coordinator.holdOverride("angleX", 5, "manual", SystemPriority.MANUAL);

      rig.coordinator.releaseOverride("angleX", "fsm");
      rig.engineFrame();

      expect(rig.angleX()).toBe(5);
    });

    it("reset() drops held overrides", () => {
      const rig = createEngineRig();
      rig.coordinator.holdOverride("angleX", 5, "manual", SystemPriority.MANUAL);
      rig.engineFrame();
      expect(rig.angleX()).toBe(5);

      rig.coordinator.reset();
      const callsBefore = rig.setValueCalls.length;
      rig.engineFrame();

      expect(rig.setValueCalls.length).toBe(callsBefore);
      expect(rig.angleX()).toBe(0);
    });
  });
});
