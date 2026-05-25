import type { Filter } from "pixi.js";

export type EffectIntensity = number;

export type QualityTier = "low" | "medium" | "high";

export interface FilterHandle {
  id: string;
}

export interface FilterEffect {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly filter: Filter;
  intensity: EffectIntensity;
  setIntensity(value: EffectIntensity): void;
  destroy(): void;
}

export interface FilterPipelineOptions {
  quality?: QualityTier;
}

export interface MoodLightingOptions {
  color: "warm" | "cool" | "neutral";
  intensity?: EffectIntensity;
}

export interface BlushOptions {
  intensity?: EffectIntensity;
  color?: number;
}

export interface GlowOptions {
  intensity?: EffectIntensity;
  color?: number;
}

export interface ColorGradingOptions {
  temperature: "warm" | "cool" | "neutral";
  intensity?: EffectIntensity;
}

export type EffectPreset =
  | "evening-warm"
  | "morning-cool"
  | "neutral"
  | "happy-glow"
  | "shy-blush"
  | "angry-red";
