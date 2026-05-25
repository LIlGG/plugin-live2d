import { describe, expect, it } from "vitest";
import { MutableParameterSet } from "../parameter-set";
import { BreathingModule, BlinkModule, EyeTrackingModule } from "../modules";
import { getEasing, easeOut, linear } from "../easing";

describe("MutableParameterSet", () => {
  it("sets and gets values", () => {
    const set = new MutableParameterSet();
    set.set("angleX", 10, "override");

    expect(set.has("angleX")).toBe(true);
    expect(set.get("angleX")?.value).toBe(10);
    expect(set.get("angleX")?.blendMode).toBe("override");
  });

  it("override wins over add", () => {
    const set = new MutableParameterSet();
    set.set("angleX", 5, "add");
    set.set("angleX", 15, "override");

    expect(set.get("angleX")?.value).toBe(15);
    expect(set.get("angleX")?.blendMode).toBe("override");
  });

  it("sums multiple add operations", () => {
    const set = new MutableParameterSet();
    set.set("breath", 0.1, "add");
    set.set("breath", 0.2, "add");

    expect(set.get("breath")?.value).toBeCloseTo(0.3, 5);
    expect(set.get("breath")?.blendMode).toBe("add");
  });

  it("existing override blocks add", () => {
    const set = new MutableParameterSet();
    set.set("angleX", 15, "override");
    set.set("angleX", 5, "add");

    expect(set.get("angleX")?.value).toBe(15);
    expect(set.get("angleX")?.blendMode).toBe("override");
  });

  it("iterates over all entries", () => {
    const set = new MutableParameterSet();
    set.set("a", 1, "override");
    set.set("b", 2, "add");

    const entries: string[] = [];
    set.forEach((semantic, value, blendMode) => {
      entries.push(`${semantic}:${value}:${blendMode}`);
    });

    expect(entries).toContain("a:1:override");
    expect(entries).toContain("b:2:add");
  });

  it("clears all entries", () => {
    const set = new MutableParameterSet();
    set.set("a", 1, "override");
    set.clear();

    expect(set.has("a")).toBe(false);
  });
});

describe("BreathingModule", () => {
  it("outputs breath parameter", () => {
    const module = new BreathingModule({ period: 3000, amplitude: 0.2 });
    const params = new MutableParameterSet();

    module.update(0, params);
    expect(params.has("breath")).toBe(true);
    expect(params.get("breath")?.blendMode).toBe("add");
  });

  it("produces oscillating values", () => {
    const module = new BreathingModule({ period: 1000, amplitude: 1 });
    const params1 = new MutableParameterSet();
    const params2 = new MutableParameterSet();

    module.update(0, params1);
    module.update(250, params2);

    const val1 = params1.get("breath")?.value ?? 0;
    const val2 = params2.get("breath")?.value ?? 0;
    // At t=250 with period=1000, should be different from t=0
    expect(val2).not.toBe(val1);
  });
});

describe("BlinkModule", () => {
  it("starts with eyes open", () => {
    const module = new BlinkModule();
    const params = new MutableParameterSet();

    module.update(0, params);
    expect(params.get("eyeLOpen")?.value).toBe(1);
    expect(params.get("eyeROpen")?.value).toBe(1);
  });

  it("closes eyes during blink", () => {
    const module = new BlinkModule({ minInterval: 0, maxInterval: 0, duration: 100 });
    const params = new MutableParameterSet();

    // Trigger blink immediately
    module.update(0, params);

    // During blink (halfway through closing phase)
    const params2 = new MutableParameterSet();
    module.update(30, params2);

    const openness = params2.get("eyeLOpen")?.value ?? 1;
    expect(openness).toBeLessThan(1);
  });
});

describe("EyeTrackingModule", () => {
  it("outputs angle parameters", () => {
    const module = new EyeTrackingModule();
    const params = new MutableParameterSet();

    module.updateCursorPosition(100, 100, {
      left: 0,
      top: 0,
      width: 200,
      height: 200,
    } as DOMRect);

    // Need multiple updates for smoothing
    for (let i = 0; i < 10; i++) {
      module.update(16, params);
    }

    expect(params.has("angleX")).toBe(true);
    expect(params.has("angleY")).toBe(true);
    expect(params.has("eyeBallX")).toBe(true);
    expect(params.has("eyeBallY")).toBe(true);
  });

  it("returns to center when cursor leaves", () => {
    const module = new EyeTrackingModule();
    const params = new MutableParameterSet();

    module.updateCursorPosition(100, 100, {
      left: 0,
      top: 0,
      width: 200,
      height: 200,
    } as DOMRect);

    // Update to move away from center
    for (let i = 0; i < 20; i++) {
      module.update(16, params);
    }

    module.onCursorLeave();

    // Give time to return to center
    const centerParams = new MutableParameterSet();
    for (let i = 0; i < 50; i++) {
      module.update(16, centerParams);
    }

    const angleX = centerParams.get("angleX")?.value ?? 999;
    expect(Math.abs(angleX)).toBeLessThan(1);
  });
});

describe("Easing functions", () => {
  it("linear goes from 0 to 1", () => {
    expect(linear(0)).toBe(0);
    expect(linear(0.5)).toBe(0.5);
    expect(linear(1)).toBe(1);
  });

  it("easeOut slows near end", () => {
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
    expect(easeOut(0.5)).toBeGreaterThan(0.5);
  });

  it("getEasing returns correct function", () => {
    expect(getEasing("linear")).toBe(linear);
    expect(getEasing("easeOut")).toBe(easeOut);
    expect(getEasing("unknown")).toBe(easeOut); // default
  });
});
