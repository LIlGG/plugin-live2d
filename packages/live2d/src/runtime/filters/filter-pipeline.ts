import type { Live2DModel } from "untitled-pixi-live2d-engine";
import type {
  BlushOptions,
  ColorGradingOptions,
  EffectPreset,
  FilterEffect,
  FilterHandle,
  FilterPipelineOptions,
  GlowOptions,
  MoodLightingOptions,
  QualityTier,
} from "./types";
import {
  BlushEffect,
  ColorGradingEffect,
  GlowEffect,
  MoodLightingEffect,
} from "./effects";

export class FilterPipeline {
  private model: Live2DModel | null = null;
  private effects = new Map<string, FilterEffect>();
  private partTargetHandles = new Map<string, FilterHandle>();
  private quality: QualityTier;

  constructor(options: FilterPipelineOptions = {}) {
    this.quality = options.quality ?? "high";
  }

  /**
   * Attach this pipeline to a Live2D model.
   */
  attachTo(model: Live2DModel): void {
    this.model = model;
    this.rebuildFilters();
  }

  /**
   * Detach from the current model and clear all effects.
   */
  detach(): void {
    if (this.model) {
      this.model.filters = null;
    }
    this.clear();
    this.model = null;
  }

  /**
   * Add a mood lighting effect.
   */
  addMoodLighting(options: MoodLightingOptions): FilterHandle {
    const id = this.generateId();
    const effect = new MoodLightingEffect({ ...options, id });
    return this.addEffect(effect);
  }

  /**
   * Add a blush effect.
   */
  addBlush(options: BlushOptions = {}): FilterHandle {
    const id = this.generateId();
    const effect = new BlushEffect({ ...options, id });
    return this.addEffect(effect);
  }

  /**
   * Add a glow effect.
   */
  addGlow(options: GlowOptions = {}): FilterHandle {
    const id = this.generateId();
    const effect = new GlowEffect({ ...options, id });
    return this.addEffect(effect);
  }

  /**
   * Add a color grading effect.
   */
  addColorGrading(options: ColorGradingOptions): FilterHandle {
    const id = this.generateId();
    const effect = new ColorGradingEffect({ ...options, id });
    return this.addEffect(effect);
  }

  /**
   * Apply a named preset.
   */
  applyPreset(preset: EffectPreset): FilterHandle {
    switch (preset) {
      case "evening-warm":
        return this.addMoodLighting({ color: "warm", intensity: 0.25 });
      case "morning-cool":
        return this.addMoodLighting({ color: "cool", intensity: 0.2 });
      case "neutral":
        return this.addColorGrading({ temperature: "neutral", intensity: 0.1 });
      case "happy-glow":
        // Warm golden mood lighting instead of a bright white wash
        return this.addMoodLighting({ color: "warm", intensity: 0.35 });
      case "shy-blush":
        // Warm reddish color grading instead of a full-screen blur
        return this.addColorGrading({ temperature: "warm", intensity: 0.3 });
      case "angry-red":
        return this.addColorGrading({ temperature: "warm", intensity: 0.4 });
      default:
        throw new Error(`Unknown preset: ${preset}`);
    }
  }

  /**
   * Apply a preset to a specific part of the model by drawable name pattern.
   *
   * Part-level targeting requires the engine to expose individual drawables
   * as separate DisplayObjects. If this is not available (e.g. the current
   * version of untitled-pixi-live2d-engine renders through a custom render
   * pipe), the effect falls back to full-model filtering.
   */
  applyPresetToPart(
    preset: EffectPreset,
    namePattern: RegExp,
  ): FilterHandle {
    const drawable = this.findDrawableByPattern(namePattern);
    if (drawable) {
      // Part-level filtering is available — apply to the specific drawable
      const handle = this.applyPreset(preset);
      this.partTargetHandles.set(handle.id, handle);
      return handle;
    }

    // Fallback: apply to the entire model
    return this.applyPreset(preset);
  }

  /**
   * Check if part-level targeting is available for the current model.
   */
  isPartLevelTargetingAvailable(): boolean {
    if (!this.model) return false;

    // Part-level targeting requires the engine to expose individual
    // drawables as Pixi DisplayObjects with their own filter arrays.
    // The current engine uses a custom render pipe, so this is not
    // supported yet. This check allows future versions to opt-in.
    const modelRecord = this.model as unknown as Record<string, unknown>;
    const internalModel = modelRecord.internalModel as
      | Record<string, unknown>
      | undefined;
    if (!internalModel) return false;

    // Check for drawable access via core model (Cubism 4/5)
    const coreModel = internalModel.coreModel as
      | Record<string, unknown>
      | undefined;
    if (coreModel) {
      const drawables =
        coreModel._drawables ?? coreModel.drawables;
      if (drawables != null) return true;
    }

    return false;
  }

  /**
   * Remove an effect by its handle.
   */
  remove(handle: FilterHandle | string): void {
    const id = typeof handle === "string" ? handle : handle.id;
    const effect = this.effects.get(id);
    if (effect) {
      effect.destroy();
      this.effects.delete(id);
      this.rebuildFilters();
    }
  }

  /**
   * Update the intensity of an active effect.
   */
  setIntensity(handle: FilterHandle | string, intensity: number): void {
    const id = typeof handle === "string" ? handle : handle.id;
    const effect = this.effects.get(id);
    if (effect) {
      effect.setIntensity(intensity);
    }
  }

  /**
   * Remove all effects.
   */
  clear(): void {
    for (const effect of this.effects.values()) {
      effect.destroy();
    }
    this.effects.clear();
    if (this.model) {
      this.model.filters = null;
    }
  }

  /**
   * Get the number of active effects.
   */
  getEffectCount(): number {
    return this.effects.size;
  }

  /**
   * Check if any effects are active.
   */
  hasEffects(): boolean {
    return this.effects.size > 0;
  }

  /**
   * Get metadata for all active effects.
   */
  getActiveEffects(): Array<{
    id: string;
    name: string;
    type: string;
    intensity: number;
  }> {
    return Array.from(this.effects.values()).map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      intensity: e.intensity,
    }));
  }

  /**
   * Set the quality tier. This affects future effects but not existing ones.
   */
  setQuality(quality: QualityTier): void {
    this.quality = quality;
  }

  private addEffect(effect: FilterEffect): FilterHandle {
    // Skip expensive effects on low quality
    if (this.quality === "low" && this.isExpensiveEffect(effect)) {
      effect.destroy();
      return { id: effect.id };
    }

    this.effects.set(effect.id, effect);
    this.rebuildFilters();
    return { id: effect.id };
  }

  private isExpensiveEffect(effect: FilterEffect): boolean {
    // Blur-based effects are more expensive than color matrix
    return effect.constructor.name.includes("Blur") ||
      effect.constructor.name.includes("Glow");
  }

  private rebuildFilters(): void {
    if (!this.model) return;

    const filters = Array.from(this.effects.values()).map((e) => e.filter);
    this.model.filters = filters.length > 0 ? filters : null;
  }

  private findDrawableByPattern(_pattern: RegExp): unknown {
    if (!this.model) return null;

    // The current version of untitled-pixi-live2d-engine renders Live2D
    // models through a custom render pipe. Individual drawables are not
    // exposed as separate Pixi DisplayObjects, so we cannot target filters
    // to specific parts. This method returns null, causing applyPresetToPart
    // to gracefully fallback to full-model filtering.
    //
    // Future engine versions may expose drawables via:
    // - model.internalModel.coreModel._drawables (Cubism 4/5)
    // - model.children as separate DisplayObjects per part
    // When that happens, this method can match drawables by name and
    // return them for filter targeting.
    return null;
  }

  private generateId(): string {
    return `fx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}
