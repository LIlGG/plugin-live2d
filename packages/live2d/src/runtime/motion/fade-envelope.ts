import { easeInOut } from "../procedural/easing";
import type { EasingFunction } from "../procedural/easing";

export type FadeState = "idle" | "fadingIn" | "active" | "fadingOut" | "stopped";

export interface FadeEnvelopeOptions {
  fadeInDuration?: number;
  fadeOutDuration?: number;
  fadeInCurve?: EasingFunction;
  fadeOutCurve?: EasingFunction;
}

export class FadeEnvelope {
  state: FadeState = "idle";
  private weight = 0;
  private fadeInDuration: number;
  private fadeOutDuration: number;
  private fadeInCurve: EasingFunction;
  private fadeOutCurve: EasingFunction;
  private fadeProgress = 0;

  constructor(options: FadeEnvelopeOptions = {}) {
    this.fadeInDuration = options.fadeInDuration ?? 300;
    this.fadeOutDuration = options.fadeOutDuration ?? 300;
    this.fadeInCurve = options.fadeInCurve ?? easeInOut;
    this.fadeOutCurve = options.fadeOutCurve ?? easeInOut;
  }

  /**
   * Start fading in.
   */
  beginFadeIn(duration?: number): void {
    if (duration !== undefined) {
      this.fadeInDuration = duration;
    }
    this.state = "fadingIn";
    this.fadeProgress = 0;
  }

  /**
   * Start fading out.
   */
  beginFadeOut(duration?: number): void {
    if (duration !== undefined) {
      this.fadeOutDuration = duration;
    }
    if (this.state === "idle" || this.state === "stopped") {
      return;
    }
    this.state = "fadingOut";
    this.fadeProgress = 0;
  }

  /**
   * Immediately set to full weight.
   */
  activate(): void {
    this.state = "active";
    this.weight = 1;
    this.fadeProgress = 1;
  }

  /**
   * Immediately stop.
   */
  stop(): void {
    this.state = "stopped";
    this.weight = 0;
    this.fadeProgress = 0;
  }

  /**
   * Update the fade state by elapsed time.
   * Returns the current weight.
   */
  update(dt: number): number {
    switch (this.state) {
      case "fadingIn": {
        this.fadeProgress += dt / this.fadeInDuration;
        if (this.fadeProgress >= 1) {
          this.fadeProgress = 1;
          this.state = "active";
        }
        this.weight = this.fadeInCurve(this.fadeProgress);
        break;
      }
      case "active": {
        this.weight = 1;
        break;
      }
      case "fadingOut": {
        this.fadeProgress += dt / this.fadeOutDuration;
        if (this.fadeProgress >= 1) {
          this.fadeProgress = 1;
          this.state = "stopped";
          this.weight = 0;
        } else {
          this.weight = 1 - this.fadeOutCurve(this.fadeProgress);
        }
        break;
      }
      case "idle":
      case "stopped": {
        this.weight = 0;
        break;
      }
    }
    return this.weight;
  }

  getWeight(): number {
    return this.weight;
  }

  isActive(): boolean {
    return this.state === "active" || this.state === "fadingIn" || this.state === "fadingOut";
  }

  isStopped(): boolean {
    return this.state === "stopped" || this.state === "idle";
  }
}
