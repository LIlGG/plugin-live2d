# plugin-live2d Runtime Evolution Roadmap (2026)

## Project Positioning

`plugin-live2d` should not evolve into a model-specific framework.

Instead, it should become:

```txt
Universal Live2D Runtime Engine
```

Goals:

* Compatible with Cubism 2.4 / 4 / 5
* Runtime-first architecture
* Model-agnostic
* Render-pipeline extensible
* AI companion ready
* Web renderer oriented
* Procedural animation capable

---

# Core Philosophy

Avoid:

```txt
if Cubism5 -> enable feature
```

Prefer:

```txt
capability detection
+ graceful fallback
```

The runtime should provide:

* unified APIs
* semantic abstractions
* rendering enhancements
* procedural behaviors

instead of depending on model-specific implementations.

---

# Recommended Architecture

```txt
packages/
  adapter/
    cubism2/
    cubism4/
    cubism5/

  runtime/
    motion/
    behavior/
    expression/
    scheduler/
    semantic/

  render/
    pixi/
    filter/
    pipeline/
    offscreen/

  procedural/
    eye-tracking/
    breathing/
    idle/
    spring/

  ai/
    emotion/
    lipsync/
    hooks/

  utils/
```

---

# Priority 1 Features

These features provide the highest long-term value.

---

# 1. Semantic Parameter Layer

## Problem

Different models use different parameter names.

Examples:

```txt
PARAM_MOUTH_OPEN_Y
PARAM_MOUTH_A
CUSTOM_MOUTH
```

Hardcoded parameter names make runtimes fragile.

---

## Goal

Provide semantic parameter APIs.

Example:

```ts
runtime.setSemantic("mouthOpen", value)
```

Internal mapping:

```ts
{
  mouthOpen: [
    "PARAM_MOUTH_OPEN_Y",
    "PARAM_MOUTH_A",
    "CUSTOM_MOUTH"
  ]
}
```

---

## Benefits

* Cubism version agnostic
* Supports non-standard models
* Supports VTubeStudio style models
* Easier AI integration
* Easier procedural animation

---

## Suggested APIs

```ts
runtime.getSemantic(name)
runtime.setSemantic(name, value)
runtime.registerSemantic(name, mappings)
runtime.hasSemantic(name)
```

---

# 2. Capability Detection System

## Problem

Different Cubism versions support different rendering features.

Runtime should not hardcode version checks.

---

## Goal

Use runtime capability flags.

Example:

```ts
runtime.capabilities = {
  mask: true,
  offscreen: false,
  blendMode: true,
  motionBlend: true,
}
```

---

## Benefits

* Better compatibility
* Cleaner architecture
* Easier future upgrades
* Graceful fallback support

---

## Suggested APIs

```ts
runtime.hasCapability(name)
runtime.requireCapability(name)
```

---

# 3. Motion Layer System

## Problem

Traditional Live2D runtimes usually allow only one active motion.

Modern AI companion systems need layered motions.

---

## Goal

Support parallel motion layers.

Example:

```txt
Idle Layer
Talking Layer
Expression Layer
Gesture Layer
Physics Layer
```

---

## Suggested APIs

```ts
runtime.motion.play({
  layer: "talk",
  priority: 10,
  blend: "override",
})
```

---

## Required Features

### Motion blending

```txt
motion A + motion B
```

### Layer priority

```txt
higher layer overrides lower layer
```

### Interrupt rules

```txt
interruptible: true/false
```

### Fade transitions

```txt
fadeIn
fadeOut
crossfade
```

---

# 4. Procedural Animation System

## Problem

Many models have few or no motion files.

Runtime should generate behaviors procedurally.

---

## Goal

Support runtime-generated animation.

---

## Suggested APIs

```ts
runtime.animate({
  target: "PARAM_ANGLE_X",
  value: 30,
  duration: 1000,
  easing: spring,
})
```

---

## Suggested Procedural Modules

### Breathing

```txt
sin wave chest motion
```

### Eye drift

```txt
small random eye movement
```

### Head follow

```txt
cursor tracking
```

### Spring physics

```txt
secondary motion
```

### Idle variation

```txt
random micro animations
```

---

# 5. Runtime Filter Pipeline

## Problem

Traditional Live2D runtimes have poor rendering extensibility.

Pixi RenderPipe enables modern rendering effects.

---

## Goal

Allow runtime-level render effects.

---

## Suggested APIs

```ts
runtime.filters.add(part, filter)
runtime.filters.remove(id)
```

---

## Example Effects

### Bloom

```txt
eye glow
magic effects
```

### Blur

```txt
soft blush
dreamy effect
```

### RGB Shift

```txt
glitch effect
```

### Color Grading

```txt
emotion lighting
```

---

## Important

Effects should NOT depend on model author support.

All effects should be runtime injected.

---

# Priority 2 Features

---

# 6. Behavior FSM

## Goal

Build a high-level behavior state machine.

Example:

```txt
idle
thinking
talking
embarrassed
angry
sleepy
```

---

## Suggested Architecture

```ts
BehaviorState
BehaviorTransition
BehaviorScheduler
```

---

## Benefits

* AI companion ready
* Better interaction quality
* Emotion consistency

---

# 7. Emotion Timeline

## Problem

Expressions switching instantly feels unnatural.

---

## Goal

Support emotion interpolation.

Example:

```txt
happy -> shy -> sad
```

instead of:

```txt
setExpression("happy")
```

---

## Suggested APIs

```ts
runtime.emotion.transition({
  from: "happy",
  to: "sad",
  duration: 2000,
})
```

---

# 8. AI Runtime Hooks

## Goal

Allow AI systems to control runtime behavior.

---

## Suggested APIs

```ts
runtime.ai.send({
  emotion,
  energy,
  speaking,
  interruptible,
})
```

---

## Future AI Integrations

### LLM

```txt
emotion extraction
```

### TTS

```txt
speech timing
```

### VAD

```txt
talk state detection
```

---

# Priority 3 Features

---

# 9. Offscreen Rendering Emulation

## Problem

Cubism 2.4 does not support modern offscreen rendering.

---

## Goal

Use Pixi RenderTexture to emulate newer features.

---

## Example

```txt
part
-> render texture
-> blend
-> composite
```

---

## Possible Effects

### Screen Blend

### Overlay Blend

### Glow Composition

### Post Processing

---

# 10. WebGPU Preparation

## Goal

Avoid WebGL-only assumptions.

---

## Recommendations

Avoid:

```txt
raw WebGL state assumptions
```

Prefer:

```txt
renderer abstraction
```

---

# 11. Runtime Graph System

## Goal

Support node-based runtime behavior.

---

## Example

```txt
emotion
-> expression
-> motion
-> filters
-> lipsync
```

---

# Important Design Principles

---

# 1. Never Depend On Specific Models

Avoid:

```txt
if model has param X
```

Prefer:

```txt
semantic lookup
```

---

# 2. Runtime Over Model

Enhance behaviors through runtime systems instead of requiring model modifications.

---

# 3. Graceful Fallback

Every advanced feature should degrade safely.

---

# 4. Render Pipeline Is A Core Strength

The biggest advantage of this project is:

```txt
Pixi Render Integration
```

not basic motion playback.

---

# 5. Cubism 2.4 Is An Advantage

Do not treat Cubism 2 support as technical debt.

Treat it as:

```txt
compatibility moat
```

Many runtimes are abandoning old models.

Universal compatibility is valuable.

---

# Suggested Long-Term Vision

```txt
plugin-live2d
=
Universal Live2D Runtime Engine
```

instead of:

```txt
Simple Web Live2D Widget
```

---

# Potential Future Directions

## AI Companion Runtime

```txt
LLM
-> emotion
-> motion
-> expression
-> rendering
```

---

## VTuber Runtime

```txt
camera tracking
microphone
emotion
realtime rendering
```

---

## Web Desktop Mascot

```txt
transparent overlay
multi-window
OS integration
```

---

# Most Valuable Future Investments

Highest long-term value:

1. Semantic Parameter Layer
2. Motion Layer System
3. Procedural Animation
4. Runtime Filter Pipeline
5. Behavior FSM

These features provide:

* cross-version compatibility
* future AI compatibility
* modern rendering extensibility
* runtime differentiation
* long-term maintainability

```
```
