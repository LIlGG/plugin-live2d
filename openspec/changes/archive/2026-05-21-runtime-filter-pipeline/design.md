## Context

plugin-live2d renders via PixiJS v8 through `untitled-pixi-live2d-engine`, which integrates natively with Pixi's Render Pipe. This means `Live2DModel` instances can use Pixi filters directly: `model.filters = [new BlurFilter({ strength: 8 })]`. However, there is currently no structured way to manage, compose, or animate filters at runtime. This design establishes a pipeline that treats visual effects as first-class runtime features.

PixiJS v8's filter system uses `Filter` with `GlProgram.from()` for shaders and typed resources for uniforms. Effects like color grading, glow, and blur are all achievable without model author support.

## Goals / Non-Goals

**Goals:**
- Provide a `FilterPipeline` API for adding/removing runtime visual effects on Live2D models
- Implement emotion-oriented built-in effects: mood lighting, blush, glow
- Support part-level filtering when the engine exposes drawable access
- Ensure filter resolution matches renderer resolution (no blurring from downsampling)
- Provide a stable handle system so effects can be referenced and removed individually

**Non-Goals:**
- Not a general-purpose shader authoring tool (no custom GLSL fragment editor)
- Not post-processing for the entire scene (scope is per-model or per-part)
- Not real-time raytracing or advanced lighting (Pixi v8 WebGPU preparation is Phase 4)
- No breaking changes to existing rendering path

## Decisions

### Effects as stateful objects with lifecycle

Each effect (e.g., `MoodLightingEffect`, `BlushEffect`) is a class that manages its own Pixi `Filter` instance and uniform updates. The `FilterPipeline` owns the array of active effects and rebuilds `model.filters` when effects are added or removed.

**Alternative**: Direct filter array manipulation by callers. **Rejected** because managing filter order, resolution, and cleanup is error-prone and should be centralized.

### Built-in effects use Pixi v8 native filters where possible

- `ColorMatrixFilter` for mood lighting (warm/cool tint)
- `BlurFilter` for soft glow and blush
- Custom `Filter` with simple GLSL for RGB shift / glitch

**Alternative**: Write all effects as custom shaders. **Rejected** because native filters are optimized and well-tested; custom shaders only where native filters are insufficient.

### Part-level filtering via drawable name matching

When `untitled-pixi-live2d-engine` exposes drawable/part access, the pipeline supports targeting filters to specific drawables by name pattern (e.g., `/eye/` → only eye parts get the glow). If the engine does not expose this, the filter falls back to applying to the entire model.

**Alternative**: Require engine modifications for part filtering. **Rejected** because we want to work with the engine as-is; part filtering is a progressive enhancement.

### Effect intensity as a normalized [0, 1] value

All built-in effects accept an `intensity` parameter. The effect implementation maps this to actual filter uniform values. This allows smooth animation of effect strength over time (e.g., blush fading in/out).

## Risks / Trade-offs

- **[Risk]** `untitled-pixi-live2d-engine` may not expose all drawable internals needed for part-level filtering. → **Mitigation**: Graceful fallback to full-model filtering. Document the limitation.
- **[Risk]** Multiple stacked filters can hurt performance on low-end GPUs. → **Mitigation**: Provide a `quality` tier setting (low/medium/high) that disables expensive filters. Effects are always optional.
- **[Risk]** Filter rendering may differ between WebGL and WebGPU backends. → **Mitigation**: Stick to standard Pixi filters that are tested on both backends. Avoid custom shaders that assume WebGL-only features.
- **[Risk]** `ColorMatrixFilter` tinting may look unnatural on some models. → **Mitigation**: Subtle default intensities (0.1-0.3). Allow per-effect override in config.

## Migration Plan

1. Create `runtime/filters/` module with `FilterPipeline` and built-in effect classes
2. Add `filterPipeline` property to `Model` class, initialized after Pixi app is ready
3. Expose filter controls through a runtime API (for future AI Hooks integration)
4. Add demo/test page showing each built-in effect
5. Document filter quality settings for performance tuning

Rollback: Set `model.filters = null` in `FilterPipeline.destroy()`. No persistent state.

## Open Questions

- Should effects support keyframe animation natively, or should that be handled by a separate animation driver? (Separate driver keeps concerns clean.)
- Should we expose effect presets (e.g., `preset: 'evening-warm'`) for common moods? (Yes, as a convenience layer on top of intensity-based effects.)
