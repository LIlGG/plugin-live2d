import type {
  EmotionName,
  EmotionProfile,
  EmotionTimelineConfig,
  EmotionTimelineContext,
  TransitionState,
  EasingName,
} from "./types";
import { getEasing } from "../procedural/easing";

export class EmotionTimeline {
  private registry = new Map<EmotionName, EmotionProfile>();
  private currentEmotion: EmotionName = "neutral";
  private transition: TransitionState | null = null;
  private context: EmotionTimelineContext;
  private config: Required<EmotionTimelineConfig>;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private currentFilterHandle: string | null = null;
  private currentParameters = new Map<string, number>();

  constructor(
    context: EmotionTimelineContext,
    config: EmotionTimelineConfig = {},
  ) {
    this.context = context;
    this.config = {
      enabled: config.enabled ?? true,
      defaultDuration: config.defaultDuration ?? 800,
      minDuration: config.minDuration ?? 300,
      defaultEasing: config.defaultEasing ?? "easeOut",
      idleReturnDelay: config.idleReturnDelay ?? 0,
    };
  }

  /**
   * Register a custom emotion profile.
   */
  registerEmotion(name: EmotionName, profile: EmotionProfile): void {
    this.registry.set(name, profile);
  }

  /**
   * Get a registered emotion profile.
   */
  getEmotionProfile(name: EmotionName): EmotionProfile | undefined {
    return this.registry.get(name);
  }

  /**
   * Transition to a target emotion.
   */
  transitionTo(
    emotion: EmotionName,
    options?: { duration?: number; easing?: EasingName },
  ): void {
    if (!this.config.enabled) return;
    if (emotion === this.currentEmotion && !this.transition) return;

    const profile = this.registry.get(emotion);
    if (!profile) {
      console.warn(`[EmotionTimeline] Unknown emotion: ${emotion}`);
      return;
    }

    // Clear idle timer
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    // Determine duration (enforced minimum)
    const duration = Math.max(
      options?.duration ?? this.config.defaultDuration,
      this.config.minDuration,
    );

    // Resolve easing
    const easingName = options?.easing ?? this.config.defaultEasing;
    const easing = getEasing(easingName);

    // Capture current parameter values as starting point
    const fromParameters = this.captureCurrentParameters();
    const toParameters = profile.parameters;

    this.transition = {
      fromEmotion: this.currentEmotion,
      toEmotion: emotion,
      startTime: performance.now(),
      duration,
      easing,
      fromParameters,
      toParameters,
    };
  }

  /**
   * Update the timeline. Should be called each frame.
   */
  update(): void {
    if (!this.transition || !this.config.enabled) return;

    const now = performance.now();
    const elapsed = now - this.transition.startTime;
    const progress = Math.min(elapsed / this.transition.duration, 1);
    const easedProgress = this.transition.easing(progress);

    // Interpolate each parameter
    const { fromParameters, toParameters } = this.transition;
    const allParams = new Set([
      ...Object.keys(fromParameters),
      ...Object.keys(toParameters),
    ]);

    const parametersToApply: Record<
      string,
      { value: number; blendMode: "override" }
    > = {};

    for (const param of allParams) {
      const fromValue = fromParameters[param] ?? 0;
      const toValue = toParameters[param] ?? 0;
      const currentValue = fromValue + (toValue - fromValue) * easedProgress;
      this.currentParameters.set(param, currentValue);
      parametersToApply[param] = { value: currentValue, blendMode: "override" };
    }

    // Output through motion layer system if available, otherwise direct
    if (this.context.motionLayerSystem) {
      // Only include parameters that the model actually supports
      const supportedParams: typeof parametersToApply = {};
      for (const [param, config] of Object.entries(parametersToApply)) {
        if (this.context.semanticLayer?.hasSemantic(param)) {
          supportedParams[param] = config;
        }
      }
      if (Object.keys(supportedParams).length > 0) {
        this.context.motionLayerSystem.play({
          layer: "expression",
          parameters: supportedParams,
          fadeIn: 0,
        });
      }
    } else if (this.context.semanticLayer) {
      for (const [param, { value }] of Object.entries(parametersToApply)) {
        if (this.context.semanticLayer.hasSemantic(param)) {
          this.context.semanticLayer.setSemantic(
            param,
            value,
            "override",
            "emotion",
            3,
          );
        }
      }
    }

    if (progress >= 1) {
      this.finishTransition();
    }
  }

  /**
   * Get the current dominant emotion.
   */
  getCurrentEmotion(): EmotionName {
    return this.currentEmotion;
  }

  /**
   * Check if a transition is currently active.
   */
  isTransitioning(): boolean {
    return this.transition !== null;
  }

  /**
   * Get the current transition progress (0–1).
   * Returns 0 if no transition is active.
   */
  getTransitionProgress(): number {
    if (!this.transition) return 0;
    const elapsed = performance.now() - this.transition.startTime;
    return Math.min(elapsed / this.transition.duration, 1);
  }

  /**
   * Get current interpolated parameter values.
   */
  getCurrentParameters(): ReadonlyMap<string, number> {
    return this.currentParameters;
  }

  /**
   * Destroy the timeline and clean up resources.
   */
  destroy(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.currentFilterHandle && this.context.filterPipeline) {
      this.context.filterPipeline.remove(this.currentFilterHandle);
      this.currentFilterHandle = null;
    }
  }

  private finishTransition(): void {
    if (!this.transition) return;

    const { toEmotion } = this.transition;
    const profile = this.registry.get(toEmotion);
    this.currentEmotion = toEmotion;
    this.transition = null;

    // Apply filter preset for the new emotion
    this.applyFilterForEmotion(profile);

    // Schedule auto-return to neutral if idle timeout is configured
    if (
      profile?.idleTimeout &&
      profile.idleTimeout > 0 &&
      toEmotion !== "neutral"
    ) {
      this.scheduleIdleReturn(profile.idleTimeout);
    }
  }

  private applyFilterForEmotion(profile: EmotionProfile | undefined): void {
    if (!this.context.filterPipeline) return;

    // Remove previous filter if present
    if (this.currentFilterHandle) {
      this.context.filterPipeline.remove(this.currentFilterHandle);
      this.currentFilterHandle = null;
    }

    // Apply new filter if specified
    if (profile?.filterPreset) {
      const handle = this.context.filterPipeline.applyPreset(
        profile.filterPreset,
      );
      this.currentFilterHandle = handle.id;

      if (profile.filterIntensity !== undefined) {
        this.context.filterPipeline.setIntensity(
          handle,
          profile.filterIntensity,
        );
      }
    }
  }

  private scheduleIdleReturn(delay: number): void {
    this.idleTimer = setTimeout(() => {
      this.transitionTo("neutral", {
        duration: this.config.defaultDuration,
        easing: this.config.defaultEasing,
      });
    }, delay);
  }

  private captureCurrentParameters(): Record<string, number> {
    // If mid-transition, use current interpolated values as starting point
    if (this.transition) {
      const result: Record<string, number> = {};
      for (const [param, value] of this.currentParameters) {
        result[param] = value;
      }
      return result;
    }

    // Otherwise use the current emotion's target parameters
    const profile = this.registry.get(this.currentEmotion);
    return profile ? { ...profile.parameters } : {};
  }
}
