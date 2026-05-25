## Why

Current expression changes in Live2D are instantaneous: `setSemantic('mouthOpen', 0.8)` jumps directly to the target value. This produces robotic, unnatural transitions. An Emotion Timeline system enables smooth interpolation between emotional states over time — e.g., transitioning from `neutral` to `happy` over 800ms with parameter curves, making the character feel alive and emotionally coherent.

## What Changes

- Introduce `EmotionTimeline` class that manages transitions between named emotional states
- Each emotion maps to a set of semantic parameter target values (e.g., `happy` → `{ eyeSmile: 0.7, mouthOpen: 0.3, cheek: 0.4 }`)
- Support configurable transition duration and easing curves
- Support interruptible transitions (new emotion target can override ongoing transition)
- Minimum transition duration enforced (default 300ms) to prevent jitter
- Auto-return to `neutral` after a configurable idle timeout
- Integrate with SemanticParameterLayer for parameter output
- Integrate with FilterPipeline for emotion-driven color grading

## Capabilities

### New Capabilities
- `emotion-timeline`: Smooth parameter interpolation between named emotional states
- `emotion-registry`: Mapping from emotion names to semantic parameter target values
- `transition-scheduler`: Queue and manage overlapping/interrupted transitions

### Modified Capabilities
- `semantic-parameter-layer`: Timeline will write parameters via `setSemantic()` during interpolation
- `runtime-filter-pipeline`: Timeline will apply color-grading presets matching the target emotion

## Impact

- **Frontend runtime**: New `packages/live2d/src/runtime/emotion/` directory
- **Semantic layer**: Timeline drives parameter values during transitions
- **Filter pipeline**: Timeline applies mood presets for emotional atmosphere
- **Model class**: Gains `emotionTimeline` property when initialized
- **Future AI Hooks**: AI emotion output will directly trigger timeline transitions
