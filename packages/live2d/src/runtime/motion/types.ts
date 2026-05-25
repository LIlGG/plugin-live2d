import type { EasingFunction } from "../procedural/easing";

export type LayerName = "idle" | "expression" | "talk" | "gesture" | "physics";

export type LayerState = "idle" | "fadingIn" | "active" | "fadingOut" | "stopped";

export type BlendMode = "override" | "add";

export interface FadeConfig {
  duration: number;
  curve: EasingFunction;
}

export interface TrackConfig {
  name: LayerName;
  priority: number;
  defaultFadeIn?: FadeConfig;
  defaultFadeOut?: FadeConfig;
  interruptible?: boolean;
}

export interface LayerOutput {
  semantic: string;
  value: number;
  blendMode: BlendMode;
  weight: number;
  source: LayerName;
}

export interface PlayOptions {
  layer: LayerName;
  parameters: Record<string, { value: number; blendMode?: BlendMode }>;
  priority?: number;
  fadeIn?: number | FadeConfig;
  fadeOut?: number | FadeConfig;
  interruptible?: boolean;
  duration?: number;
}

export interface MotionLayerConfig {
  enabled?: boolean;
  layers?: Partial<Record<LayerName, Partial<TrackConfig>>>;
  defaultCrossfadeDuration?: number;
}

export interface LayerStatus {
  name: LayerName;
  state: LayerState;
  priority: number;
  weight: number;
  activeParameters: string[];
}
