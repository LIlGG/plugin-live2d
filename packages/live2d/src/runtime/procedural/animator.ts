import type { SemanticParameterLayer } from "../semantic";
import { getEasing } from "./easing";
import type { EasingFunction } from "./easing";
import type { AnimationOptions, ParameterSet, ProceduralModule } from "./types";

interface ActiveAnimation {
  target: string;
  from: number;
  to: number;
  duration: number;
  elapsed: number;
  easing: EasingFunction;
  onComplete?: () => void;
}

export class ProceduralAnimator implements ProceduralModule {
  readonly name = "animator";
  enabled = true;
  private animations: ActiveAnimation[] = [];
  private semanticLayer: SemanticParameterLayer;

  constructor(semanticLayer: SemanticParameterLayer) {
    this.semanticLayer = semanticLayer;
  }

  animate(options: AnimationOptions): Promise<void> {
    const currentValue = this.semanticLayer.getSemantic(options.target) ?? 0;
    const easing =
      typeof options.easing === "string"
        ? getEasing(options.easing)
        : options.easing ?? getEasing("easeOut");

    return new Promise((resolve) => {
      this.animations.push({
        target: options.target,
        from: currentValue,
        to: options.to,
        duration: options.duration,
        elapsed: 0,
        easing,
        onComplete: resolve,
      });
    });
  }

  update(dt: number, params: ParameterSet): void {
    const completed: ActiveAnimation[] = [];

    for (const anim of this.animations) {
      anim.elapsed += dt;
      const progress = Math.min(1, anim.elapsed / anim.duration);
      const easedProgress = anim.easing(progress);
      const value = anim.from + (anim.to - anim.from) * easedProgress;

      params.set(anim.target, value, "override");

      if (progress >= 1) {
        completed.push(anim);
      }
    }

    for (const anim of completed) {
      const index = this.animations.indexOf(anim);
      if (index >= 0) {
        this.animations.splice(index, 1);
      }
      anim.onComplete?.();
    }
  }
}
