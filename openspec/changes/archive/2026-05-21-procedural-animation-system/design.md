## Context

plugin-live2d's `Model` class renders Live2D models via PixiJS v8 but currently does not add any ambient animation. Models with motion files play them, but many models (especially Cubism 2 and user-created ones) have limited or no motions. Even well-equipped models benefit from subtle procedural behaviors — breathing, natural blinking, eye tracking — that make the character feel alive during idle periods.

The Pixi `Application` provides a `ticker` that runs every frame. `untitled-pixi-live2d-engine` accepts this ticker in `Live2DModel.from({ ticker })`, meaning model parameter updates can be synchronized with Pixi's render loop.

## Goals / Non-Goals

**Goals:**
- Implement a modular procedural animation system driven by Pixi ticker
- Provide built-in ambient modules: breathing, blinking, eye/cursor tracking
- Each module outputs semantic parameter changes (via Semantic Parameter Layer)
- Support runtime module registration/unregistration
- Provide a one-shot animation API for scripted procedural motions (spring, ease)
- Integrate cleanly with model lifecycle: attach on ready, detach on destroy

**Non-Goals:**
- Not a replacement for motion file playback (`.mtn`, `.motion3.json`)
- Not a physics engine (no cloth, hair, or complex rigid body simulation)
- Not facial capture or camera input
- Not IK-based animation (that requires Cubism 5 SDK features not available in all models)

## Decisions

### Module-based architecture with per-frame update

The `ProceduralAnimationSystem` maintains an array of `ProceduralModule` instances. Each frame, the system calls `module.update(dt, parameterSet)` where `parameterSet` is a write-only accumulator. After all modules update, the system applies accumulated values to the model via Semantic Parameter Layer.

**Alternative**: Each module directly calls `semanticLayer.set()`. **Rejected** because direct writes cause race conditions when multiple modules target the same parameter (e.g., eye tracking and head motion both affect `angleX`).

### ParameterSet accumulator with blend mode resolution

`ParameterSet` collects writes from all modules. When multiple modules write the same semantic with different blend modes (`override` vs `add`), the system resolves them: `override` wins over `add` if both are present for the same semantic; if only `add`s, they are summed.

**Alternative**: No accumulation, modules coordinate explicitly. **Rejected** because explicit coordination is fragile and requires modules to know about each other.

### One-shot animations via tween-like API

A `ProceduralAnimator` class supports one-shot animations: `animate({ target: 'angleX', to: 30, duration: 1000, easing: 'easeOutSpring' })`. These are registered as temporary modules that auto-unregister on completion.

**Alternative**: Integrate with a full tweening library like GSAP. **Rejected** because the scope is small enough for a lightweight internal implementation. GSAP is heavy and adds a dependency.

### Eye tracking supports multiple input sources

The `EyeTrackingModule` accepts a normalized `(x, y)` target in [-1, 1] range. Input can come from:
- Mouse/touch position (default)
- AI command bus (future: AI-specified gaze direction)
- Scripted animations (one-shot look-at)

The module smooths the target using exponential decay (spring-like lerp) to avoid jarring jumps.

## Risks / Trade-offs

- **[Risk]** Multiple modules updating parameters may conflict with motion playback. → **Mitigation**: Procedural system runs at a lower priority than motion playback. Parameters written by procedural system are treated as "base layer" and can be overridden by active motions. (Full priority system comes with Motion Layer System in Phase 2.)
- **[Risk]** `dt` (delta time) from Pixi ticker may vary causing inconsistent animation speed. → **Mitigation**: All modules use `dt` for time-based calculations, not frame count. Cap `dt` at 100ms to prevent large jumps on tab switch.
- **[Risk]** Blinking may desync with model's native auto-blink if enabled. → **Mitigation**: Detect if model has native auto-blink and disable the procedural blink module in that case.
- **[Risk]** Spring physics can overshoot or oscillate on low frame rates. → **Mitigation**: Use critically-damped spring (no oscillation) with velocity clamping.

## Migration Plan

1. Create `runtime/procedural/` module with `ProceduralAnimationSystem`, `ParameterSet`, and built-in modules
2. Integrate into `Model` lifecycle: instantiate after `SemanticParameterLayer` detection, attach to Pixi ticker
3. Add default config to enable/disable each module (all enabled by default)
4. Wire mouse position to `EyeTrackingModule` via window event listeners
5. Document module behavior and configuration options

Rollback: Call `system.detach()` before model destroy. Removes ticker callback and clears all modules.

## Open Questions

- Should breathing module adjust its frequency/intensity based on "arousal" level (from AI emotion)? (Yes, but requires AI Hooks integration — design the hook point now.)
- Should modules be hot-swappable at runtime (e.g., disable blink during a specific animation)? (Yes, expose `enableModule(name)` / `disableModule(name)` APIs.)
- Should one-shot animations support chained sequences? (Future enhancement; keep initial API simple.)
