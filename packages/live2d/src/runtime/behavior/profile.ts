import type { BehaviorProfile } from "./types";
import type { LayerName } from "../motion/types";

/**
 * Merge two behavior profiles. The override takes precedence.
 * For motion layers, parameters are deep-merged.
 */
export function mergeProfiles(
  base: BehaviorProfile,
  override: BehaviorProfile,
): BehaviorProfile {
  return {
    motionLayers: mergeMotionLayers(base.motionLayers, override.motionLayers),
    filters: mergeFilters(base.filters, override.filters),
    semanticParameters: mergeSemanticParameters(
      base.semanticParameters,
      override.semanticParameters,
    ),
    proceduralOverrides: {
      ...base.proceduralOverrides,
      ...override.proceduralOverrides,
    },
  };
}

type MotionLayerMap = NonNullable<BehaviorProfile["motionLayers"]>;

function mergeMotionLayers(
  base?: MotionLayerMap,
  override?: MotionLayerMap,
): MotionLayerMap | undefined {
  if (!base) return override;
  if (!override) return base;

  const result: MotionLayerMap = { ...base };
  for (const layer of Object.keys(override) as LayerName[]) {
    const effect = override[layer];
    const baseEffect = result[layer];
    if (baseEffect && effect) {
      result[layer] = {
        ...baseEffect,
        ...effect,
        parameters: {
          ...baseEffect.parameters,
          ...effect.parameters,
        },
      };
    } else {
      result[layer] = effect;
    }
  }
  return result;
}

function mergeFilters(
  base?: BehaviorProfile["filters"],
  override?: BehaviorProfile["filters"],
): BehaviorProfile["filters"] {
  if (!base) return override;
  if (!override) return base;
  return [...base, ...override];
}

function mergeSemanticParameters(
  base?: BehaviorProfile["semanticParameters"],
  override?: BehaviorProfile["semanticParameters"],
): BehaviorProfile["semanticParameters"] {
  if (!base) return override;
  if (!override) return base;
  return { ...base, ...override };
}

/**
 * Build a behavior state profile from a base profile and optional overrides.
 */
export function buildProfile(
  base: BehaviorProfile,
  ...overrides: (BehaviorProfile | undefined)[]
): BehaviorProfile {
  let result = base;
  for (const override of overrides) {
    if (override) {
      result = mergeProfiles(result, override);
    }
  }
  return result;
}
