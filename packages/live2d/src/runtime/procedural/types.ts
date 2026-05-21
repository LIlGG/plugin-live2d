import type { BlendMode } from "../semantic/types";
import type { EasingFunction } from "./easing";

export interface ProceduralModule {
  readonly name: string;
  enabled: boolean;
  update(dt: number, params: ParameterSet): void;
}

export interface ParameterSet {
  set(semantic: string, value: number, blendMode: BlendMode): void;
  get(semantic: string): { value: number; blendMode: BlendMode } | undefined;
  has(semantic: string): boolean;
  forEach(callback: (semantic: string, value: number, blendMode: BlendMode) => void): void;
}

export interface AnimationOptions {
  target: string;
  to: number;
  duration: number;
  easing?: EasingFunction | string;
}

export interface ProceduralConfig {
  enabled?: boolean;
  breathing?: {
    enabled?: boolean;
    period?: number;
    amplitude?: number;
  };
  blink?: {
    enabled?: boolean;
    minInterval?: number;
    maxInterval?: number;
    duration?: number;
  };
  eyeTracking?: {
    enabled?: boolean;
    maxAngleX?: number;
    maxAngleY?: number;
    maxEyeBallX?: number;
    maxEyeBallY?: number;
    smoothing?: number;
  };
}
