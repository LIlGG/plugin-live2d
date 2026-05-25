## 1. Module Setup

- [x] 1.1 Create `packages/live2d/src/runtime/motion/` directory structure
- [x] 1.2 Define TypeScript interfaces: `MotionLayer`, `MotionTrack`, `FadeEnvelope`, `LayerState`
- [x] 1.3 Define standard layer priorities and default configurations

## 2. Core System Implementation

- [x] 2.1 Implement `MotionLayerSystem` class with layer registry
- [x] 2.2 Implement `MotionTrack` with independent playback state and lifecycle
- [x] 2.3 Implement `FadeEnvelope` with configurable duration and curve
- [x] 2.4 Implement cross-layer parameter blending (override vs add, weight normalization)
- [x] 2.5 Implement interrupt rules (priority check + interruptible flag)
- [x] 2.6 Implement layer state query API (`isPlaying`, `getActiveLayers`, `getLayerState`)
- [x] 2.7 Integrate with `SemanticParameterLayer` for final parameter output

## 3. Integration with Existing Systems

- [x] 3.1 Refactor `ProceduralAnimationSystem` to output through `physics` layer
- [x] 3.2 Add fallback direct-write path when `MotionLayerSystem` is disabled
- [x] 3.3 Add `motionLayerSystem` property to `Model` class
- [x] 3.4 Initialize `MotionLayerSystem` in `Model` lifecycle
- [x] 3.5 Expose `Model.getMotionLayerSystem()` public accessor

## 4. API Design

- [x] 4.1 Implement `play({ layer, motion, priority, fadeIn, fadeOut, blend, interruptible })`
- [x] 4.2 Implement `stop(layer)` with optional fadeOut
- [x] 4.3 Implement `crossfade({ layer, from, to, duration })`
- [x] 4.4 Keep existing `.motion()` API backward compatible (route to `idle` layer)

## 5. Configuration

- [x] 5.1 Add `motionLayers` config to `Live2dConfig`: enable/disable system
- [x] 5.2 Add per-layer default priority and fade duration config
- [x] 5.3 Add global crossfade default duration config

## 6. Testing

- [x] 6.1 Unit test: Concurrent playback on idle + talk layers
- [x] 6.2 Unit test: Higher priority overrides lower priority on same parameter
- [x] 6.3 Unit test: Add blend mode sums values from multiple layers
- [x] 6.4 Unit test: Fade-in weight increases over configured duration
- [x] 6.5 Unit test: Fade-out weight decreases over configured duration
- [x] 6.6 Unit test: Crossfade between consecutive motions on same layer
- [x] 6.7 Unit test: Non-interruptible track rejects lower-priority incoming motion
- [x] 6.8 Unit test: Procedural animation outputs to physics layer when motion layers enabled
- [x] 6.9 Unit test: Backward compatibility — direct write when motion layers disabled
- [x] 6.10 Integration test: Full layer stack (idle + expression + talk + gesture + physics)
