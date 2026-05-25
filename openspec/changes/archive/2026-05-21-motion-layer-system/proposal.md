## Why

Traditional Live2D runtimes allow only one active motion at a time. This means a model cannot simultaneously breathe (idle), speak (lip sync), express emotion, and gesture — motions interrupt each other instead of layering. A Motion Layer System enables parallel motion tracks with priority-based blending, fade transitions, and interrupt rules, bringing plugin-live2d from a "single-motion player" to a "multi-track animation runtime."

## What Changes

- Introduce `MotionLayerSystem` with named layers: `idle`, `expression`, `talk`, `gesture`, `physics`
- Implement `MotionTrack` per layer with its own playback state, fade envelope, and priority
- Implement cross-layer parameter blending: higher priority `override` wins, same-priority `add` blends
- Support fadeIn / fadeOut / crossfade transitions per track (duration configurable)
- Support interrupt rules: `interruptible` flag on tracks, `force` priority for emergency overrides
- Provide `play({ layer, motion, priority, fadeIn, blend })` API
- Expose layer state query API: `getLayerState(layer)`, `isPlaying(layer)`, `getActiveLayers()`
- Integrate with existing `SemanticParameterLayer` for parameter output

## Capabilities

### New Capabilities
- `motion-layer-system`: Multi-track parallel motion playback with priority and blending
- `motion-track`: Single-layer motion track with fade envelope and lifecycle
- `cross-layer-blending`: Parameter blending rules across concurrent layers
- `fade-transitions`: Smooth fadeIn/fadeOut/crossfade between motion states

### Modified Capabilities
- `procedural-animation-system`: Procedural modules (breathing, eye tracking) will output to the `physics` layer as a base layer instead of directly writing to `SemanticParameterLayer`, ensuring they blend correctly with motion playback

## Impact

- **Frontend runtime**: New `packages/live2d/src/runtime/motion/` directory
- **Procedural animation**: Modules will output to Motion Layer System instead of directly to Semantic Layer
- **Model class**: Gains `motionLayerSystem` property, initialized after `ProceduralAnimationSystem`
- **Existing motion playback**: Current `.motion()` API remains backward compatible (maps to a default layer)
- **Future AI Hooks**: AI commands will target specific motion layers (e.g., `talk` layer for speaking motions)
