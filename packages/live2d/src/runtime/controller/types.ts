import type { EffectPreset } from "../filters/types";
import type { EasingName } from "../emotion/types";

export enum SystemPriority {
  MANUAL = 1,
  FSM = 2,
  EMOTION = 3,
  MOTION = 4,
  PROCEDURAL = 5,
}

export interface ParameterWrite {
  parameter: string;
  value: number;
  blendMode: "override" | "add";
  source: string;
  priority: SystemPriority;
}

export interface ConflictEntry {
  timestamp: number;
  parameter: string;
  winningSystem: string;
  losingSystem: string;
  winningValue: number;
  losingValue: number;
}

export interface ControllerConfig {
  enabled?: boolean;
  devTools?: {
    enabled?: boolean;
  };
  behaviorFSM?: {
    enabled?: boolean;
    initialState?: string;
    defaultDebounceMs?: number;
  };
  emotionTimeline?: {
    enabled?: boolean;
    defaultDuration?: number;
    minDuration?: number;
    defaultEasing?: EasingName;
    idleReturnDelay?: number;
  };
  motionLayers?: {
    enabled?: boolean;
    layers?: {
      idle?: { priority?: number };
      expression?: { priority?: number };
      talk?: { priority?: number };
      gesture?: { priority?: number };
      physics?: { priority?: number };
    };
    defaultCrossfadeDuration?: number;
  };
  proceduralAnimation?: {
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
  };
  filterQuality?: "low" | "medium" | "high";
}

export interface ControllerState {
  fsmState: string | null;
  emotion: string | null;
  isTransitioning: boolean;
  transitionProgress: number;
  activeFilters: Array<{
    id: string;
    name: string;
    type: string;
    intensity: number;
  }>;
  motionLayers: Array<{
    name: string;
    state: string;
    weight: number;
    priority: number;
  }>;
  proceduralModules: Array<{
    name: string;
    enabled: boolean;
  }>;
}

export interface TransitionOptions {
  fsm?: string;
  emotion?: string;
  filter?: EffectPreset;
  duration?: number;
}
