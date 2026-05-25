## Context

plugin-live2d currently supports motion playback through `untitled-pixi-live2d-engine`'s built-in motion manager (`model.motion()`), but this is a single-track system: playing a new motion interrupts the current one. The recently implemented `ProceduralAnimationSystem` also writes directly to `SemanticParameterLayer`, which means procedural animations and motion playback can conflict on the same parameters.

A Motion Layer System is needed to:
1. Enable concurrent motion playback on separate tracks
2. Resolve parameter conflicts between layers via priority and blend modes
3. Provide smooth transitions between motion states via fade envelopes

## Goals / Non-Goals

**Goals:**
- Support 5 standard motion layers: `idle`, `expression`, `talk`, `gesture`, `physics`
- Each layer has its own `MotionTrack` with independent playback, fade, and priority
- Cross-layer blending: resolve parameter conflicts by priority (`override` > `add`)
- Fade transitions: `fadeIn` / `fadeOut` with configurable duration
- Interrupt rules: tracks can be marked `interruptible`, higher priority can override
- State queries: inspect active layers, playback progress, pending transitions
- Integrate with `ProceduralAnimationSystem` (procedural outputs to `physics` layer)

**Non-Goals:**
- Not a full animation editor or timeline sequencer
- Not skeletal IK (out of scope, requires Cubism 5 SDK)
- Not real-time physics simulation (cloth, hair)
- Not replacing the engine's native motion parser (`.motion3.json` loading remains unchanged)

## Decisions

### Layer output goes through SemanticParameterLayer

After all layers compute their parameter outputs, the `MotionLayerSystem` writes to `SemanticParameterLayer` using the same semantic names. This maintains the abstraction: motion layers don't need to know actual parameter IDs.

**Alternative**: Write directly to model core. **Rejected** because it bypasses the semantic abstraction and would re-introduce model-specific parameter dependencies.

### Fade envelope is per-track, not global

Each `MotionTrack` manages its own fade state (`fadingIn`, `active`, `fadingOut`). This allows one layer to fade out while another fades in independently.

**Alternative**: Global crossfader that manages all layers. **Rejected** because per-track fading is more flexible (e.g., idle layer stays active while talk layer fades in/out).

### `physics` layer is the base layer for procedural animation

The `ProceduralAnimationSystem`'s modules (breathing, eye tracking) will output to the `physics` layer at the lowest priority. This ensures procedural animations are always active unless explicitly overridden by a higher-priority layer.

**Alternative**: Procedural system stays independent. **Rejected** because without layering, procedural and motion outputs would continue to conflict on shared parameters.

### Interrupt rules use priority + explicit flag

A track can be interrupted if:
1. The incoming track has higher priority, OR
2. The current track has `interruptible: true`

Priority levels: `0` (physics) < `1` (idle) < `2` (expression) < `3` (talk) < `4` (gesture) < `10` (force override)

## Risks / Trade-offs

- **[Risk]** Multiple active layers with overlapping parameters could cause visual glitches if blend weights sum incorrectly. → **Mitigation**: Normalize blend weights per parameter when multiple `add` layers target the same semantic.
- **[Risk]** Fade transitions may conflict with the engine's native motion fading. → **Mitigation**: Disable engine-level fading when Motion Layer System is active; our fade envelope replaces it.
- **[Risk]** Performance overhead from computing multiple layers every frame. → **Mitigation**: Skip inactive layers; only update layers whose `weight > 0` or that have active motions.
- **[Risk]** ProceduralAnimationSystem refactor could break existing behavior. → **Mitigation**: Keep the old direct-write path as fallback when motion layers are disabled.

## Migration Plan

1. Create `runtime/motion/` module with `MotionLayerSystem`, `MotionTrack`, `FadeEnvelope`
2. Refactor `ProceduralAnimationSystem` to output to `physics` layer instead of direct semantic writes
3. Integrate into `Model` lifecycle: initialize after `ProceduralAnimationSystem`
4. Add `model.getMotionLayerSystem()` public accessor
5. Keep existing `.motion()` API backward compatible (routes to `idle` layer with default priority)

## Open Questions

- Should layers support dynamic creation (user-defined layers beyond the 5 standard ones)? (No for now — 5 layers cover all use cases.)
- Should fade curves be configurable (linear, easeIn, easeOut)? (Yes, default easeInOut, configurable per-play call.)
