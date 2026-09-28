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
  settle?: () => void;
}

export class ProceduralAnimator implements ProceduralModule {
  readonly name = "animator";
  enabled = true;
  private animations: ActiveAnimation[] = [];
  private semanticLayer: SemanticParameterLayer;
  private heldTargets = new Set<string>();

  constructor(semanticLayer: SemanticParameterLayer) {
    this.semanticLayer = semanticLayer;
  }

  animate(options: AnimationOptions): Promise<void> {
    const currentValue = this.semanticLayer.getRenderedSemantic(options.target) ?? 0;
    if (this.heldTargets.delete(options.target)) {
      this.semanticLayer.releaseSemantic(options.target, "animator");
    }
    // A parameter has one animation owner. Settle replaced animations so their
    // promises do not remain pending, and prevent them from writing or holding
    // an older target after this animation takes over.
    for (let index = this.animations.length - 1; index >= 0; index--) {
      const active = this.animations[index];
      if (active.target === options.target) {
        this.animations.splice(index, 1);
        active.settle?.();
      }
    }
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
        settle: resolve,
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
    }

    // A completed animation should leave its target visible after the engine
    // restores the frame baseline.
    for (const anim of completed) {
      this.semanticLayer.holdSemantic(anim.target, anim.to, "animator", 5);
      this.heldTargets.add(anim.target);
      anim.settle?.();
    }
  }

  releaseHeldTargets(): void {
    for (const target of this.heldTargets) {
      this.semanticLayer.releaseSemantic(target, "animator");
    }
    this.heldTargets.clear();
  }

  stopAll(): void {
    this.releaseHeldTargets();
    for (const animation of this.animations) {
      animation.settle?.();
    }
    this.animations = [];
  }
}
