## 1. Module Setup

- [x] 1.1 Create `packages/live2d/src/runtime/procedural/` directory structure
- [x] 1.2 Define TypeScript interfaces: `ProceduralModule`, `ParameterSet`, `AnimationOptions`
- [x] 1.3 Define easing functions: `linear`, `easeOut`, `easeInOut`, `spring`

## 2. Core System Implementation

- [x] 2.1 Implement `ParameterSet` accumulator with blend mode resolution (`override` vs `add`)
- [x] 2.2 Implement `ProceduralAnimationSystem` with module registration/unregistration
- [x] 2.3 Implement per-frame update loop via Pixi ticker with `dt` capping at 100ms
- [x] 2.4 Implement `ProceduralAnimator` for one-shot animations with auto-unregister
- [x] 2.5 Implement `animate()` fluent API with target, duration, easing support

## 3. Built-in Modules

- [x] 3.1 Implement `BreathingModule` with configurable sine-wave period and amplitude
- [x] 3.2 Implement `BlinkModule` with random intervals and natural blink curve
- [x] 3.3 Implement `EyeTrackingModule` with mouse/touch following and smooth interpolation
- [x] 3.4 Add native auto-blink detection to disable procedural blink when conflicting

## 4. Model Integration

- [x] 4.1 Add `proceduralSystem` property to `Model` class
- [x] 4.2 Initialize system after `SemanticParameterLayer` detection (dependency)
- [x] 4.3 Attach to Pixi ticker on model ready, detach on model destroy
- [x] 4.4 Wire mouse/touch events to `EyeTrackingModule` via window listeners

## 5. Configuration

- [x] 5.1 Add procedural animation config to `Live2dConfig`: enable/disable per module
- [x] 5.2 Add breathing frequency/amplitude config options
- [x] 5.3 Add blink interval range and duration config options
- [x] 5.4 Add eye tracking max angle and eyeball range config options

## 6. Testing

- [x] 6.1 Visual test: Breathing module produces visible subtle chest motion
- [x] 6.2 Visual test: Blink module triggers natural-looking blinks at random intervals
- [x] 6.3 Visual test: Eye tracking smoothly follows cursor
- [x] 6.4 Test: One-shot animation completes and auto-unregisters
- [x] 6.5 Test: ParameterSet correctly resolves override vs add blend modes
- [x] 6.6 Test: System detaches cleanly on model destroy (no ticker leaks)
- [x] 6.7 Test: `dt` capping prevents large jumps after tab backgrounding
