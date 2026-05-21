import type { LayerName } from "../motion/types";
import type { EffectPreset } from "../filters/types";
import type { MotionLayerSystem } from "../motion";
import type { FilterPipeline } from "../filters";
import type { SemanticParameterLayer } from "../semantic";
import type { ProceduralAnimationSystem } from "../procedural";

export type StateName = string;

export type ParameterBlendMode = "override" | "add";

export interface MotionLayerEffect {
  parameters: Record<string, { value: number; blendMode?: ParameterBlendMode }>;
  fadeIn?: number;
}

export interface BehaviorProfile {
  motionLayers?: Partial<Record<LayerName, MotionLayerEffect>>;
  filters?: EffectPreset[];
  semanticParameters?: Record<
    string,
    { value: number; blendMode?: ParameterBlendMode }
  >;
  proceduralOverrides?: Record<string, boolean>;
}

export interface BehaviorState {
  name: StateName;
  entryProfile?: BehaviorProfile;
  exitProfile?: BehaviorProfile;
  onEnter?: (context: BehaviorContext) => void;
  onExit?: (context: BehaviorContext) => void;
  transitionGuard?: TransitionGuard;
  debounceMs?: number;
}

export type TransitionGuard = (from: StateName, to: StateName) => boolean;

export interface BehaviorContext {
  motionLayerSystem?: MotionLayerSystem;
  filterPipeline?: FilterPipeline;
  semanticLayer?: SemanticParameterLayer;
  proceduralSystem?: ProceduralAnimationSystem;
}

export interface BehaviorFSMConfig {
  enabled?: boolean;
  initialState?: StateName;
  defaultDebounceMs?: number;
}
