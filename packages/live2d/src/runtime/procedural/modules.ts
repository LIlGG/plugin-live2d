import type { ProceduralModule, ParameterSet } from "./types";

export class BreathingModule implements ProceduralModule {
  readonly name = "breathing";
  enabled = true;
  private phase = 0;
  private period: number;
  private amplitude: number;

  constructor(options: { period?: number; amplitude?: number } = {}) {
    this.period = options.period ?? 3000;
    this.amplitude = options.amplitude ?? 0.15;
  }

  update(dt: number, params: ParameterSet): void {
    this.phase += dt;
    const normalizedTime = this.phase / this.period;
    const value = Math.sin(normalizedTime * Math.PI * 2) * 0.5 + 0.5;
    params.set("breath", value * this.amplitude, "add");
  }
}

export class BlinkModule implements ProceduralModule {
  readonly name = "blink";
  enabled = true;
  private state: "open" | "closing" | "closed" | "opening" = "open";
  private timer = 0;
  private nextBlinkTime = 0;
  private blinkProgress = 0;
  private minInterval: number;
  private maxInterval: number;
  private duration: number;

  constructor(options: {
    minInterval?: number;
    maxInterval?: number;
    duration?: number;
  } = {}) {
    this.minInterval = options.minInterval ?? 2000;
    this.maxInterval = options.maxInterval ?? 6000;
    this.duration = options.duration ?? 150;
    this.scheduleNextBlink();
  }

  update(dt: number, params: ParameterSet): void {
    switch (this.state) {
      case "open": {
        this.timer += dt;
        if (this.timer >= this.nextBlinkTime) {
          this.state = "closing";
          this.blinkProgress = 0;
          this.timer = 0;
        }
        params.set("eyeLOpen", 1, "override");
        params.set("eyeROpen", 1, "override");
        break;
      }
      case "closing": {
        this.blinkProgress += dt / (this.duration * 0.5);
        if (this.blinkProgress >= 1) {
          this.state = "opening";
          this.blinkProgress = 1;
        }
        const openness = 1 - this.easeInOut(this.blinkProgress);
        params.set("eyeLOpen", openness, "override");
        params.set("eyeROpen", openness, "override");
        break;
      }
      case "opening": {
        this.blinkProgress -= dt / (this.duration * 0.5);
        if (this.blinkProgress <= 0) {
          this.state = "open";
          this.timer = 0;
          this.scheduleNextBlink();
        }
        const openness = 1 - this.easeInOut(Math.max(0, 1 - this.blinkProgress));
        params.set("eyeLOpen", openness, "override");
        params.set("eyeROpen", openness, "override");
        break;
      }
      case "closed": {
        params.set("eyeLOpen", 0, "override");
        params.set("eyeROpen", 0, "override");
        break;
      }
    }
  }

  private scheduleNextBlink(): void {
    this.nextBlinkTime =
      this.minInterval +
      Math.random() * (this.maxInterval - this.minInterval);
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
}

export class EyeTrackingModule implements ProceduralModule {
  readonly name = "eyeTracking";
  enabled = true;
  private targetX = 0;
  private targetY = 0;
  private currentX = 0;
  private currentY = 0;
  private overrideTarget: { x: number; y: number } | null = null;
  private maxAngleX: number;
  private maxAngleY: number;
  private maxEyeBallX: number;
  private maxEyeBallY: number;
  private smoothing: number;
  private cursorLeaveTimeout: number | null = null;
  private isCursorOverCanvas = false;

  constructor(options: {
    maxAngleX?: number;
    maxAngleY?: number;
    maxEyeBallX?: number;
    maxEyeBallY?: number;
    smoothing?: number;
  } = {}) {
    this.maxAngleX = options.maxAngleX ?? 15;
    this.maxAngleY = options.maxAngleY ?? 10;
    this.maxEyeBallX = options.maxEyeBallX ?? 1.5;
    this.maxEyeBallY = options.maxEyeBallY ?? 1.5;
    this.smoothing = options.smoothing ?? 0.15;
  }

  setTarget(x: number, y: number): void {
    this.overrideTarget = { x, y };
  }

  releaseTarget(): void {
    this.overrideTarget = null;
  }

  updateCursorPosition(x: number, y: number, canvasRect: DOMRect): void {
    this.isCursorOverCanvas = true;
    if (this.cursorLeaveTimeout !== null) {
      clearTimeout(this.cursorLeaveTimeout);
      this.cursorLeaveTimeout = null;
    }

    const nx = ((x - canvasRect.left) / canvasRect.width) * 2 - 1;
    const ny = ((y - canvasRect.top) / canvasRect.height) * 2 - 1;
    this.targetX = Math.max(-1, Math.min(1, nx));
    // Screen Y increases downward, but model Y increases upward — negate
    this.targetY = Math.max(-1, Math.min(1, -ny));
  }

  onCursorLeave(): void {
    if (this.cursorLeaveTimeout !== null) {
      clearTimeout(this.cursorLeaveTimeout);
    }
    this.cursorLeaveTimeout = window.setTimeout(() => {
      this.isCursorOverCanvas = false;
    }, 100);
  }

  update(_dt: number, params: ParameterSet): void {
    let tx: number;
    let ty: number;

    if (this.overrideTarget !== null) {
      tx = this.overrideTarget.x;
      ty = this.overrideTarget.y;
    } else if (this.isCursorOverCanvas) {
      tx = this.targetX;
      ty = this.targetY;
    } else {
      // Return to center when cursor leaves
      tx = 0;
      ty = 0;
    }

    // Smooth interpolation
    const t = this.smoothing;
    this.currentX += (tx - this.currentX) * t;
    this.currentY += (ty - this.currentY) * t;

    params.set("angleX", this.currentX * this.maxAngleX, "add");
    params.set("angleY", this.currentY * this.maxAngleY, "add");
    params.set("eyeBallX", this.currentX * this.maxEyeBallX, "add");
    params.set("eyeBallY", this.currentY * this.maxEyeBallY, "add");
  }
}
