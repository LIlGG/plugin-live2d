## 1. Module Setup

- [x] 1.1 Create `packages/live2d/src/runtime/emotion/` directory structure
- [x] 1.2 Define TypeScript interfaces: `EmotionTimeline`, `EmotionProfile`, `TransitionState`
- [x] 1.3 Define easing support for transitions

## 2. Core Timeline Implementation

- [x] 2.1 Implement `EmotionTimeline` class with registry
- [x] 2.2 Implement `transitionTo()` with configurable duration and easing
- [x] 2.3 Implement interpolation loop (current value -> target value over time)
- [x] 2.4 Implement interrupt handling (new transition mid-transition)
- [x] 2.5 Implement minimum transition duration enforcement
- [x] 2.6 Implement auto-return to neutral after idle timeout

## 3. Emotion Registry

- [x] 3.1 Create default `EMOTION_REGISTRY` with 8 built-in emotions
- [x] 3.2 Map `neutral` emotion (all parameters at default)
- [x] 3.3 Map `happy` emotion (eyeSmile, mouthOpen, cheek)
- [x] 3.4 Map `sad` emotion (browY, eyeScale, mouthForm)
- [x] 3.5 Map `angry` emotion (browAngle, eyeOpen, mouthOpen)
- [x] 3.6 Map `shy` / `embarrassed` emotion (eyeScale, cheek, headAngle)
- [x] 3.7 Map `surprised` emotion (eyeOpen, mouthOpen, browY)
- [x] 3.8 Map `sleepy` emotion (eyeOpen, headAngle, breath)
- [x] 3.9 Support runtime registration of custom emotions

## 4. Filter Integration

- [x] 4.1 Link emotion profiles to filter presets
- [x] 4.2 Crossfade filter intensity during emotion transitions
- [x] 4.3 Support per-emotion filter intensity override

## 5. Integration

- [x] 5.1 Add `emotionTimeline` property to `Model` class
- [x] 5.2 Initialize timeline in `Model` lifecycle
- [x] 5.3 Expose `Model.getEmotionTimeline()` public accessor
- [x] 5.4 Add `emotionTimeline` config to `Live2dConfig`

## 6. Testing

- [x] 6.1 Unit test: Transition from neutral to happy over 500ms
- [x] 6.2 Unit test: Parameter values interpolate correctly at 50%
- [x] 6.3 Unit test: Interrupt mid-transition uses current value as start
- [x] 6.4 Unit test: Minimum duration prevents instant transitions
- [x] 6.5 Unit test: Auto-return to neutral after idle timeout
- [x] 6.6 Unit test: Custom emotion registration works
- [x] 6.7 Integration test: Full transition cycle neutral -> happy -> sad -> neutral
