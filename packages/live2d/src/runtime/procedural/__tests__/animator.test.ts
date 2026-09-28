import { describe, expect, it, vi } from "vitest";
import { SemanticParameterLayer } from "../../semantic";
import { ProceduralAnimator } from "../animator";
import { MutableParameterSet } from "../parameter-set";

describe("ProceduralAnimator", () => {
  it("starts from the last rendered value after the engine restores its baseline", () => {
    const layer = new SemanticParameterLayer();
    vi.spyOn(layer, "getSemantic").mockReturnValue(0);
    vi.spyOn(layer, "getRenderedSemantic").mockReturnValue(20);
    const animator = new ProceduralAnimator(layer);
    const params = new MutableParameterSet();

    void animator.animate({ target: "angleX", to: 30, duration: 100, easing: (t) => t });
    animator.update(50, params);

    expect(params.get("angleX")?.value).toBe(25);
  });

  it("holds the terminal target and releases it when another animation starts", () => {
    const layer = new SemanticParameterLayer();
    vi.spyOn(layer, "getRenderedSemantic").mockReturnValue(0);
    const holdSemantic = vi.spyOn(layer, "holdSemantic").mockImplementation(() => {});
    const releaseSemantic = vi.spyOn(layer, "releaseSemantic").mockImplementation(() => {});
    const animator = new ProceduralAnimator(layer);
    const params = new MutableParameterSet();

    void animator.animate({ target: "angleX", to: 20, duration: 100, easing: (t) => t });
    animator.update(100, params);
    expect(params.get("angleX")?.value).toBe(20);
    expect(holdSemantic).toHaveBeenCalledWith("angleX", 20, "animator", 5);

    void animator.animate({ target: "angleX", to: 30, duration: 100, easing: (t) => t });
    expect(releaseSemantic).toHaveBeenCalledWith("angleX", "animator");
    animator.update(50, params);
    expect(params.get("angleX")?.value).toBe(15);

    animator.update(50, params);
    expect(holdSemantic).toHaveBeenLastCalledWith("angleX", 30, "animator", 5);
    animator.releaseHeldTargets();
    expect(releaseSemantic).toHaveBeenCalledTimes(2);
  });
});
