import type { EasingFunction } from "../procedural/easing";
import type { EffectPreset } from "../filters/types";
import type { SemanticParameterLayer } from "../semantic";
import type { FilterPipeline } from "../filters";
import type { MotionLayerSystem } from "../motion";

export type EmotionName = string;

export type EasingName =
  | "linear"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | "spring";

export interface EmotionProfile {
  parameters: Record<string, number>;
  filterPreset?: EffectPreset;
  filterIntensity?: number;
  idleTimeout?: number;
}

export interface EmotionTimelineConfig {
  enabled?: boolean;
  defaultDuration?: number;
  minDuration?: number;
  defaultEasing?: EasingName;
  idleReturnDelay?: number;
}

export interface TransitionState {
  fromEmotion: EmotionName;
  toEmotion: EmotionName;
  startTime: number;
  duration: number;
  easing: EasingFunction;
  fromParameters: Record<string, number>;
  toParameters: Record<string, number>;
}

export interface EmotionTimelineContext {
  semanticLayer?: SemanticParameterLayer;
  filterPipeline?: FilterPipeline;
  motionLayerSystem?: MotionLayerSystem;
}
