## 1. Module Setup

- [x] 1.1 Create `packages/live2d/src/runtime/filters/` directory structure
- [x] 1.2 Define TypeScript interfaces: `FilterEffect`, `FilterHandle`, `FilterPipeline`
- [x] 1.3 Define `EffectIntensity` type and `QualityTier` enum

## 2. Core Pipeline Implementation

- [x] 2.1 Implement `FilterPipeline` class with `add()`, `remove()`, `clear()` methods
- [x] 2.2 Implement stable handle generation and effect tracking
- [x] 2.3 Ensure filter resolution inherits from Pixi renderer
- [x] 2.4 Implement dynamic intensity adjustment on active effects
- [x] 2.5 Wire `FilterPipeline` into `Model` class as `filterPipeline` property

## 3. Built-in Effects

- [x] 3.1 Implement `MoodLightingEffect` using Pixi `ColorMatrixFilter`
- [x] 3.2 Implement `BlushEffect` using Pixi `BlurFilter` + tint
- [x] 3.3 Implement `GlowEffect` using Pixi `BlurFilter` + blend mode
- [x] 3.4 Implement `ColorGradingEffect` for warm/cool emotion tones
- [x] 3.5 Create effect presets: `evening-warm`, `morning-cool`, `neutral`

## 4. Part-level Filtering (Progressive Enhancement)

- [x] 4.1 Investigate `untitled-pixi-live2d-engine` drawable exposure API
- [x] 4.2 Implement part-level targeting by drawable name pattern (if API available)
- [x] 4.3 Implement fallback to full-model filtering when part targeting unavailable

## 5. Integration & Configuration

- [x] 5.1 Add `filterQuality` config option to `Live2dConfig`
- [x] 5.2 Initialize `FilterPipeline` in `Model` after Pixi app is ready
- [x] 5.3 Add public runtime API for external systems (future AI Hooks integration)

## 6. Testing

- [x] 6.1 Visual test: Mood lighting warm effect renders correctly
- [x] 6.2 Visual test: Blush effect fades in/out with intensity animation
- [x] 6.3 Performance test: 3 stacked filters maintain 60fps on mid-tier GPU
- [x] 6.4 Test `clear()` removes all effects and restores normal rendering
- [x] 6.5 Test backward compatibility: no filters applied by default
