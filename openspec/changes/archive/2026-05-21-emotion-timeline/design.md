## Context

Expression changes in Live2D are currently instantaneous jumps: a parameter goes from value A to value B in a single frame. This is unnatural — real emotions transition gradually. The Emotion Timeline system provides smooth interpolation between emotional states, making expression changes feel organic and lifelike.

This system builds on top of the Semantic Parameter Layer (which provides uniform parameter access) and will later be driven by AI output (emotion labels extracted from LLM responses).

## Goals / Non-Goals

**Goals:**
- Define named emotions mapped to semantic parameter target values
- Support smooth interpolation between emotions over configurable duration
- Support easing curves for natural acceleration/deceleration
- Support emotion interrupting (new target overrides ongoing transition)
- Auto-return to `neutral` after configurable timeout
- Integrate with FilterPipeline for emotion-driven color grading

**Non-Goals:**
- Not a full animation sequencer with keyframes
- Not physics-based emotion dynamics (no momentum/bounce)
- Not facial capture input

## Decisions

### Emotion registry is a static mapping

A `EMOTION_REGISTRY` object maps emotion names to `{ semantic: value }` targets. This is loaded at initialization and can be extended at runtime.

**Alternative**: Dynamic emotion discovery. **Rejected** because a predefined registry is sufficient and easier to reason about.

### Transitions use the current interpolated value as the starting point

When a new transition starts mid-transition, the starting value is the current interpolated position, not the original start value. This prevents jumps.

### Minimum transition duration is enforced

Default 300ms. This prevents jitter from rapid emotion commands (e.g., from a streaming AI that changes its mind).

### Color grading is linked to the dominant emotion

Each emotion can specify a filter preset. During transition, the filter preset crossfades from the old emotion to the new one.

## Risks / Trade-offs

- **[Risk]** Parameter interpolation may conflict with motion layer output. → **Mitigation**: Emotion timeline writes to the `expression` motion layer, so it participates in the normal layer blending system.
- **[Risk]** Filter preset crossfading may be expensive. → **Mitigation**: Only update filter intensity once per frame, not per parameter.
- **[Risk]** Auto-return to neutral may feel artificial. → **Mitigation**: Configurable idle timeout; can be disabled per emotion.

## Architecture

```
EmotionTimeline
├── registry: Map<string, EmotionProfile>
├── currentState: { emotion, intensity, startTime }
├── transition: { from, to, duration, easing, progress }
├── idleTimer?: number
└── transitionTo(emotion, duration?, easing?): void

EmotionProfile
├── parameters: Record<SemanticName, number>
├── filterPreset?: EffectPreset
├── filterIntensity?: number
└── idleTimeout?: number (auto-return to neutral after this ms)
```

## Specs

- `emotion-timeline`: Core interpolation engine, transition management
- `emotion-registry`: Emotion-to-parameter mapping definitions
- `transition-scheduler`: Queue, interrupt, and blend overlapping transitions

## Tasks

### 1. Module Setup

- [ ] 1.1 Create `packages/live2d/src/runtime/emotion/` directory
- [ ] 1.2 Define TypeScript interfaces: `EmotionTimeline`, `EmotionProfile`, `TransitionState`
- [ ] 1.3 Define easing support for transitions

### 2. Core Timeline Implementation

- [ ] 2.1 Implement `EmotionTimeline` class with registry
- [ ] 2.2 Implement `transitionTo()` with configurable duration and easing
- [ ] 2.3 Implement interpolation loop (current value → target value over time)
- [ ] 2.4 Implement interrupt handling (new transition mid-transition)
- [ ] 2.5 Implement minimum transition duration enforcement
- [ ] 2.6 Implement auto-return to neutral after idle timeout

### 3. Emotion Registry

- [ ] 3.1 Create default `EMOTION_REGISTRY` with 8 built-in emotions
- [ ] 3.2 Map `neutral` emotion (all parameters at default)
- [ ] 3.3 Map `happy` emotion (eyeSmile, mouthOpen, cheek)
- [ ] 3.4 Map `sad` emotion (browY, eyeScale, mouthForm)
- [ ] 3.5 Map `angry` emotion (browAngle, eyeOpen, mouthOpen)
- [ ] 3.6 Map `shy` / `embarrassed` emotion (eyeScale, cheek, headAngle)
- [ ] 3.7 Map `surprised` emotion (eyeOpen, mouthOpen, browY)
- [ ] 3.8 Map `sleepy` emotion (eyeOpen, headAngle, breath)
- [ ] 3.9 Support runtime registration of custom emotions

### 4. Filter Integration

- [ ] 4.1 Link emotion profiles to filter presets
- [ ] 4.2 Crossfade filter intensity during emotion transitions
- [ ] 4.3 Support per-emotion filter intensity override

### 5. Integration

- [ ] 5.1 Add `emotionTimeline` property to `Model` class
- [ ] 5.2 Initialize timeline in `Model` lifecycle
- [ ] 5.3 Expose `Model.getEmotionTimeline()` public accessor
- [ ] 5.4 Add `emotionTimeline` config to `Live2dConfig`

### 6. Testing

- [ ] 6.1 Unit test: Transition from neutral to happy over 500ms
- [ ] 6.2 Unit test: Parameter values interpolate correctly at 50%
- [ ] 6.3 Unit test: Interrupt mid-transition uses current value as start
- [ ] 6.4 Unit test: Minimum duration prevents instant transitions
- [ ] 6.5 Unit test: Auto-return to neutral after idle timeout
- [ ] 6.6 Unit test: Custom emotion registration works
- [ ] 6.7 Integration test: Full transition cycle neutral → happy → sad → neutral
