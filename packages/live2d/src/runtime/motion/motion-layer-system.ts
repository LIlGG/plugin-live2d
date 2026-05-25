import type { SemanticParameterLayer } from "../semantic";
import type {
  BlendMode,
  LayerName,
  LayerStatus,
  MotionLayerConfig,
  PlayOptions,
  TrackConfig,
} from "./types";
import { MotionTrack } from "./motion-track";

const DEFAULT_LAYER_CONFIGS: Record<LayerName, TrackConfig> = {
  physics: { name: "physics", priority: 0, interruptible: true },
  idle: { name: "idle", priority: 1, interruptible: true },
  expression: { name: "expression", priority: 2, interruptible: true },
  talk: { name: "talk", priority: 3, interruptible: true },
  gesture: { name: "gesture", priority: 4, interruptible: true },
};

interface BlendedOutput {
  semantic: string;
  value: number;
  blendMode: BlendMode;
  priority: number;
  source: LayerName;
}

export class MotionLayerSystem {
  private tracks = new Map<LayerName, MotionTrack>();
  private semanticLayer: SemanticParameterLayer;

  constructor(
    semanticLayer: SemanticParameterLayer,
    config: MotionLayerConfig = {},
  ) {
    this.semanticLayer = semanticLayer;

    for (const [name, defaultConfig] of Object.entries(DEFAULT_LAYER_CONFIGS)) {
      const layerConfig = config.layers?.[name as LayerName];
      this.tracks.set(name as LayerName, new MotionTrack({
        ...defaultConfig,
        ...layerConfig,
        name: name as LayerName,
      }));
    }
  }

  /**
   * Play parameters on a specific layer.
   */
  play(options: PlayOptions): void {
    const track = this.tracks.get(options.layer);
    if (!track) return;

    // Check interrupt rules
    if (track.isActive() && !track.isInterruptible()) {
      const incomingPriority = options.priority ?? track.getPriority();
      if (incomingPriority <= track.getPriority()) {
        return; // Cannot interrupt
      }
    }

    // If track is already active, fade out current before playing new (crossfade)
    if (track.isActive()) {
      const crossfadeDuration = typeof options.fadeIn === "number"
        ? options.fadeIn
        : options.fadeIn?.duration;
      track.stop(crossfadeDuration);
    }

    track.play(options);
  }

  /**
   * Stop a layer with optional fade out.
   */
  stop(layer: LayerName, fadeOutDuration?: number): void {
    const track = this.tracks.get(layer);
    track?.stop(fadeOutDuration);
  }

  /**
   * Crossfade from current parameters to new parameters on the same layer.
   */
  crossfade(layer: LayerName, options: Omit<PlayOptions, "layer">): void {
    const track = this.tracks.get(layer);
    if (!track) return;

    const crossfadeDuration = typeof options.fadeIn === "number"
      ? options.fadeIn
      : options.fadeIn?.duration ?? 300;

    // Fade out current
    track.stop(crossfadeDuration);

    // Play new with same fade duration for smooth crossfade
    this.play({
      ...options,
      layer,
      fadeIn: crossfadeDuration,
    });
  }

  /**
   * Clear all layers.
   */
  clearAll(): void {
    for (const track of this.tracks.values()) {
      track.clear();
    }
  }

  /**
   * Update all tracks and apply blended outputs to SemanticParameterLayer.
   */
  update(dt: number): void {
    // Update all tracks
    for (const track of this.tracks.values()) {
      track.update(dt);
    }

    // Collect outputs from all tracks
    const allOutputs: BlendedOutput[] = [];

    for (const track of this.tracks.values()) {
      const outputs = track.getOutputs();
      for (const output of outputs) {
        allOutputs.push({
          ...output,
          priority: track.getPriority(),
          source: track.name,
        });
      }
    }

    // Group by semantic and blend
    const grouped = new Map<string, BlendedOutput[]>();
    for (const output of allOutputs) {
      const list = grouped.get(output.semantic) ?? [];
      list.push(output);
      grouped.set(output.semantic, list);
    }

    // Apply blended values
    for (const [semantic, outputs] of grouped) {
      if (!this.semanticLayer.hasSemantic(semantic)) continue;

      // Separate override and add outputs
      const overrides = outputs.filter((o) => o.blendMode === "override");
      const adds = outputs.filter((o) => o.blendMode === "add");

      // Find highest-priority override
      let finalValue = 0;
      let hasOverride = false;

      if (overrides.length > 0) {
        const highest = overrides.reduce((a, b) =>
          a.priority > b.priority ? a : b,
        );
        finalValue = highest.value;
        hasOverride = true;
      }

      // Sum all add outputs
      if (adds.length > 0) {
        const addSum = adds.reduce((sum, o) => sum + o.value, 0);
        if (hasOverride) {
          finalValue += addSum;
        } else {
          finalValue = addSum;
        }
      }

      this.semanticLayer.setSemantic(
        semantic,
        finalValue,
        hasOverride ? "override" : "add",
        "motion",
      );
    }
  }

  /**
   * Check if a layer is currently playing.
   */
  isPlaying(layer: LayerName): boolean {
    return this.tracks.get(layer)?.isActive() ?? false;
  }

  /**
   * Get all active layer names.
   */
  getActiveLayers(): LayerName[] {
    return Array.from(this.tracks.entries())
      .filter(([, track]) => track.isActive())
      .map(([name]) => name);
  }

  /**
   * Get detailed status of all layers.
   */
  getLayerStatuses(): LayerStatus[] {
    return Array.from(this.tracks.entries()).map(([name, track]) => ({
      name,
      state: track.getState(),
      priority: track.getPriority(),
      weight: track.getWeight(),
      activeParameters: Array.from(
        track.getOutputs().map((o) => o.semantic),
      ),
    }));
  }

  /**
   * Get a specific track.
   */
  getTrack(layer: LayerName): MotionTrack | undefined {
    return this.tracks.get(layer);
  }

  /**
   * Set parameters on the physics layer directly (for continuous updates).
   * This bypasses fade transitions.
   */
  setPhysicsParameters(
    parameters: Record<string, { value: number; blendMode?: "override" | "add" }>,
  ): void {
    const physics = this.tracks.get("physics");
    physics?.setParameters(parameters);
  }
}
