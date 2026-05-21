import type { Ticker } from "pixi.js";
import type { SemanticParameterLayer } from "../semantic";
import { MutableParameterSet } from "./parameter-set";
import type { ProceduralConfig, ProceduralModule } from "./types";
import { BreathingModule, BlinkModule, EyeTrackingModule } from "./modules";
import { ProceduralAnimator } from "./animator";

const MAX_DT_MS = 100;

export type ProceduralOutputCallback = (
  params: Array<{ semantic: string; value: number; blendMode: "override" | "add" }>,
) => void;

export class ProceduralAnimationSystem {
  private modules: ProceduralModule[] = [];
  private parameterSet = new MutableParameterSet();
  private semanticLayer: SemanticParameterLayer;
  private tickerCallback?: () => void;
  private animator: ProceduralAnimator;
  private eyeTrackingModule?: EyeTrackingModule;
  private outputCallback?: ProceduralOutputCallback;

  constructor(
    semanticLayer: SemanticParameterLayer,
    config: ProceduralConfig = {},
  ) {
    this.semanticLayer = semanticLayer;
    this.animator = new ProceduralAnimator(semanticLayer);

    if (config.enabled !== false) {
      if (config.breathing?.enabled !== false) {
        this.register(
          new BreathingModule({
            period: config.breathing?.period,
            amplitude: config.breathing?.amplitude,
          }),
        );
      }

      if (config.blink?.enabled === true) {
        this.register(
          new BlinkModule({
            minInterval: config.blink?.minInterval,
            maxInterval: config.blink?.maxInterval,
            duration: config.blink?.duration,
          }),
        );
      }

      if (config.eyeTracking?.enabled !== false) {
        this.eyeTrackingModule = new EyeTrackingModule({
          maxAngleX: config.eyeTracking?.maxAngleX,
          maxAngleY: config.eyeTracking?.maxAngleY,
          maxEyeBallX: config.eyeTracking?.maxEyeBallX,
          maxEyeBallY: config.eyeTracking?.maxEyeBallY,
          smoothing: config.eyeTracking?.smoothing,
        });
        this.register(this.eyeTrackingModule);
      }
    }

    // Animator is always registered (but only active when animations are queued)
    this.register(this.animator);
  }

  /**
   * Set an output callback to receive procedural parameter changes
   * instead of writing directly to SemanticParameterLayer.
   * When set, the callback receives the parameters each frame.
   * When not set, parameters are written directly to SemanticParameterLayer.
   */
  setOutputCallback(callback: ProceduralOutputCallback | undefined): void {
    this.outputCallback = callback;
  }

  attachTo(ticker: Ticker): void {
    this.tickerCallback = () => {
      // Cap dt to prevent large jumps
      const cappedDt = Math.min(ticker.deltaMS, MAX_DT_MS);
      this.update(cappedDt);
    };
    ticker.add(this.tickerCallback);
  }

  detach(ticker?: Ticker): void {
    if (this.tickerCallback && ticker) {
      ticker.remove(this.tickerCallback);
    }
    this.tickerCallback = undefined;
    this.modules = [];
    this.parameterSet.clear();
  }

  register(module: ProceduralModule): void {
    this.modules.push(module);
  }

  unregister(module: ProceduralModule): void {
    const index = this.modules.indexOf(module);
    if (index >= 0) {
      this.modules.splice(index, 1);
    }
  }

  enableModule(name: string): void {
    const module = this.modules.find((m) => m.name === name);
    if (module) module.enabled = true;
  }

  disableModule(name: string): void {
    const module = this.modules.find((m) => m.name === name);
    if (module) module.enabled = false;
  }

  getAnimator(): ProceduralAnimator {
    return this.animator;
  }

  getEyeTrackingModule(): EyeTrackingModule | undefined {
    return this.eyeTrackingModule;
  }

  /**
   * Get the current status of all registered modules.
   */
  getModuleStatuses(): Array<{ name: string; enabled: boolean }> {
    return this.modules.map((m) => ({ name: m.name, enabled: m.enabled }));
  }

  private update(dt: number): void {
    this.parameterSet.clear();

    for (const module of this.modules) {
      if (module.enabled) {
        module.update(dt, this.parameterSet);
      }
    }

    const outputs: Array<{ semantic: string; value: number; blendMode: "override" | "add" }> = [];
    this.parameterSet.forEach((semantic, value, blendMode) => {
      outputs.push({ semantic, value, blendMode });
    });

    if (this.outputCallback) {
      // Route through motion layer system
      this.outputCallback(outputs);
    } else {
      // Direct write (backward compatible)
      for (const { semantic, value, blendMode } of outputs) {
        this.semanticLayer.setSemantic(semantic, value, blendMode, "procedural", 5);
      }
    }
  }
}
