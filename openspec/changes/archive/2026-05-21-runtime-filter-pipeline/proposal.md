## Why

Traditional Live2D runtimes have limited rendering extensibility — effects like bloom, blush glow, or mood lighting typically require model author support. Since plugin-live2d already uses PixiJS v8 with `untitled-pixi-live2d-engine`, we have access to Pixi's full Filter and RenderTexture pipeline. A Runtime Filter Pipeline allows injecting visual effects at runtime without modifying models, turning rendering into a core differentiator of this project.

## What Changes

- Create a `FilterPipeline` class that manages PixiJS v8 filters applied to Live2D models
- Implement part-level filter targeting (when engine exposes drawable access)
- Build a set of built-in emotion-oriented effects: mood lighting, blush, glow, subtle color grading
- Provide `add()`, `remove()`, and `clear()` APIs with stable filter handles
- Integrate with the AI Runtime Hooks layer (future) so emotion commands can trigger visual effects
- Ensure filter resolution inherits from the Pixi renderer to avoid blurring

## Capabilities

### New Capabilities
- `runtime-filter-pipeline`: Runtime-injected visual effects via PixiJS v8 Filter system
- `model-part-filtering`: Apply filters to specific model parts/drawables

### Modified Capabilities
- (none — purely additive rendering enhancement)

## Impact

- **Frontend runtime**: New `packages/live2d/src/runtime/filters/` directory
- **Model wrapper**: `Model` class gains a `filterPipeline` property after initialization
- **Pixi dependency**: Uses existing PixiJS v8 `Filter`, `ColorMatrixFilter`, `BlurFilter`
- **Performance**: Filter overhead scales with effect complexity; all effects are optional
