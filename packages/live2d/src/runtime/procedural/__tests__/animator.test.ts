import { describe, expect, it, vi } from "vitest";
import { SemanticParameterLayer } from "../../semantic";
import { ProceduralAnimator } from "../animator";
import { MutableParameterSet } from "../parameter-set";
import { ProceduralAnimationSystem } from "../procedural-animation-system";

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

  it("lets a newer short animation keep its target after an older long one would finish", async () => {
    const layer = new SemanticParameterLayer();
    vi.spyOn(layer, "getRenderedSemantic").mockReturnValue(0);
    const holdSemantic = vi.spyOn(layer, "holdSemantic").mockImplementation(() => {});
    const animator = new ProceduralAnimator(layer);
    const params = new MutableParameterSet();

    const older = animator.animate({ target: "angleX", to: 20, duration: 300, easing: (t) => t });
    animator.update(50, params);
    const newer = animator.animate({ target: "angleX", to: 5, duration: 50, easing: (t) => t });

    params.clear();
    animator.update(50, params);
    expect(params.get("angleX")?.value).toBe(5);
    expect(holdSemantic).toHaveBeenLastCalledWith("angleX", 5, "animator", 5);

    params.clear();
    animator.update(250, params);
    expect(params.get("angleX")).toBeUndefined();
    expect(holdSemantic).toHaveBeenCalledTimes(1);
    await expect(Promise.all([older, newer])).resolves.toEqual([undefined, undefined]);
  });

  it("keeps animations for other parameters running when one target is replaced", () => {
    const layer = new SemanticParameterLayer();
    vi.spyOn(layer, "getRenderedSemantic").mockReturnValue(0);
    vi.spyOn(layer, "holdSemantic").mockImplementation(() => {});
    const animator = new ProceduralAnimator(layer);
    const params = new MutableParameterSet();

    void animator.animate({ target: "angleX", to: 20, duration: 100, easing: (t) => t });
    void animator.animate({ target: "angleY", to: 10, duration: 100, easing: (t) => t });
    void animator.animate({ target: "angleX", to: 5, duration: 100, easing: (t) => t });
    animator.update(50, params);

    expect(params.get("angleX")?.value).toBe(2.5);
    expect(params.get("angleY")?.value).toBe(5);
  });

  it("settles active animations and releases terminal holds when detached", async () => {
    const layer = new SemanticParameterLayer();
    vi.spyOn(layer, "getRenderedSemantic").mockReturnValue(0);
    vi.spyOn(layer, "holdSemantic").mockImplementation(() => {});
    const releaseSemantic = vi.spyOn(layer, "releaseSemantic").mockImplementation(() => {});
    const system = new ProceduralAnimationSystem(layer, { enabled: false });
    const animator = system.getAnimator();
    void animator.animate({ target: "angleY", to: 10, duration: 1 });
    animator.update(1, new MutableParameterSet());
    let settled = false;
    void animator.animate({ target: "angleX", to: 20, duration: 1000 }).then(() => {
      settled = true;
    });

    system.detach();
    await Promise.resolve();

    expect(settled).toBe(true);
    expect(releaseSemantic).toHaveBeenCalledWith("angleY", "animator");
  });
});
