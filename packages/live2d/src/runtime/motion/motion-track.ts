import type { BlendMode, LayerName, LayerState, PlayOptions, TrackConfig } from "./types";
import { FadeEnvelope } from "./fade-envelope";

export interface TrackOutput {
  semantic: string;
  value: number;
  blendMode: BlendMode;
}

export class MotionTrack {
  readonly name: LayerName;
  private priority: number;
  private envelope: FadeEnvelope;
  private currentParameters = new Map<string, { value: number; blendMode: BlendMode }>();
  private config: TrackConfig;
  private remainingDuration: number | null = null;

  constructor(config: TrackConfig) {
    this.name = config.name;
    this.priority = config.priority;
    this.config = config;
    this.envelope = new FadeEnvelope({
      fadeInDuration: config.defaultFadeIn?.duration,
      fadeOutDuration: config.defaultFadeOut?.duration,
    });
  }

  /**
   * Set parameters directly (for continuous updates like physics layer).
   * No fade, weight stays at 1.
   */
  setParameters(
    parameters: Record<string, { value: number; blendMode?: BlendMode }>,
  ): void {
    this.currentParameters.clear();
    for (const [semantic, { value, blendMode }] of Object.entries(parameters)) {
      this.currentParameters.set(semantic, {
        value,
        blendMode: blendMode ?? "add",
      });
    }
    this.envelope.activate();
  }

  /**
   * Start playing parameters on this track with fade.
   */
  play(options: PlayOptions): void {
    this.priority = options.priority ?? this.config.priority;
    this.currentParameters.clear();
    for (const [semantic, { value, blendMode }] of Object.entries(
      options.parameters,
    )) {
      this.currentParameters.set(semantic, {
        value,
        blendMode: blendMode ?? "override",
      });
    }

    // Set fade config
    const fadeInDuration =
      typeof options.fadeIn === "number"
        ? options.fadeIn
        : options.fadeIn?.duration;
    const fadeOutDuration =
      typeof options.fadeOut === "number"
        ? options.fadeOut
        : options.fadeOut?.duration;
    if (fadeInDuration !== undefined || fadeOutDuration !== undefined) {
      this.envelope = new FadeEnvelope({ fadeInDuration, fadeOutDuration });
    }

    this.envelope.beginFadeIn(fadeInDuration);
    this.remainingDuration = options.duration ?? null;
  }

  /**
   * Stop this track with optional fade out.
   */
  stop(fadeOutDuration?: number): void {
    this.envelope.beginFadeOut(fadeOutDuration);
  }

  /**
   * Immediately clear all parameters.
   */
  clear(): void {
    this.currentParameters.clear();
    this.envelope.stop();
  }

  /**
   * Update the track state by elapsed time.
   */
  update(dt: number): void {
    this.envelope.update(dt);

    if (this.remainingDuration !== null) {
      this.remainingDuration -= dt;
      if (this.remainingDuration <= 0) {
        this.remainingDuration = null;
        this.envelope.beginFadeOut();
      }
    }

    // If stopped and weight is 0, clear parameters
    if (this.envelope.isStopped()) {
      this.currentParameters.clear();
    }
  }

  /**
   * Get current output with weight applied.
   */
  getOutputs(): TrackOutput[] {
    const weight = this.envelope.getWeight();
    if (weight <= 0) return [];

    return Array.from(this.currentParameters.entries()).map(([semantic, { value, blendMode }]) => ({
      semantic,
      value: value * weight,
      blendMode,
    }));
  }

  getState(): LayerState {
    return this.envelope.state;
  }

  getPriority(): number {
    return this.priority;
  }

  getWeight(): number {
    return this.envelope.getWeight();
  }

  isActive(): boolean {
    return this.envelope.isActive();
  }

  isInterruptible(): boolean {
    return this.config.interruptible ?? true;
  }

  hasParameter(semantic: string): boolean {
    return this.currentParameters.has(semantic);
  }
}
