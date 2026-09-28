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
});
