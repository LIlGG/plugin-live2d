## Why

Many Live2D models ship with few or no motion files, especially older Cubism 2 models and user-created models. Even models with motions often lack subtle ambient behaviors like breathing, natural blinking, or idle eye drift. A Procedural Animation System generates these behaviors at runtime, making every model feel alive regardless of its motion asset completeness. This also provides the foundation for AI-driven animation (e.g., head following the cursor, spring physics for secondary motion).

## What Changes

- Create a `ProceduralAnimationSystem` that registers modules and updates them via the Pixi ticker
- Implement built-in modules: `BreathingModule`, `BlinkModule`, `EyeTrackingModule`
- Each module outputs semantic parameter changes via the Semantic Parameter Layer
- Support module registration/unregistration at runtime
- Provide a fluent animation API for one-shot procedural animations (e.g., `animate({ target: 'angleX', value: 30, duration: 1000, easing: 'spring' })`)
- Integrate with `Model` lifecycle: attach on model ready, detach on destroy

## Capabilities

### New Capabilities
- `procedural-animation-system`: Runtime-generated ambient and reactive animations
- `breathing-module`: Subtle sine-wave chest motion via semantic parameters
- `blink-module`: Random-interval eye blinking with natural timing
- `eye-tracking-module`: Smooth head/eyeball following of cursor or AI-specified gaze target

### Modified Capabilities
- (none — additive runtime enhancement)

## Impact

- **Frontend runtime**: New `packages/live2d/src/runtime/procedural/` directory
- **Model lifecycle**: `Model` attaches/detaches `ProceduralAnimationSystem` alongside Pixi ticker
- **Dependency**: Requires Semantic Parameter Layer to be implemented first
- **Performance**: Modules run every frame via Pixi ticker; designed to be lightweight
