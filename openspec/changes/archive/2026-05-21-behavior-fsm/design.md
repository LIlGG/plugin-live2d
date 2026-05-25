## Context

plugin-live2d now has a Motion Layer System for parallel animation tracks, a Filter Pipeline for visual effects, and a Semantic Parameter Layer for unified parameter access. However, there is no high-level concept that ties these together. A Behavior FSM provides a declarative way to say "the character is embarrassed right now" and have that automatically map to: a specific expression on the `expression` layer, a blush filter, reduced eye contact (eye tracking offset), and an idle motion with higher breath amplitude.

## Goals / Non-Goals

**Goals:**
- Define named behavior states with associated motion/filter/parameter profiles
- Support state transitions with guards and hooks
- Integrate with MotionLayerSystem, FilterPipeline, and SemanticParameterLayer
- Provide a simple API: `fsm.transitionTo('happy')`

**Non-Goals:**
- Not a full Hierarchical State Machine (no nested states for now)
- Not event-driven triggers (no complex event bus); transitions are explicit calls
- Not replacing motion file playback — states reference motions but don't define them

## Decisions

### States defined as data, not code

Each state is a plain object (`BehaviorState`) describing what to activate, not a class with methods. This keeps states declarative and serializable.

**Alternative**: Class-based states with `onEnter()` / `onExit()` methods. **Rejected** because data-driven states are easier to configure and extend.

### BehaviorProfile is a snapshot of effects

A `BehaviorProfile` captures: motion layer parameters, filter presets, and semantic parameter targets. When entering a state, the FSM "applies" this snapshot to the runtime systems.

### Entry/Exit hooks are optional callbacks

For extensibility, states support optional `onEnter` and `onExit` callbacks that receive the runtime systems as context. These are for custom logic that can't be expressed in the profile.

### Transitions are immediate with optional crossfade

When `transitionTo('newState')` is called, the old state's effects are stopped/reversed and the new state's effects are applied. If `crossfade` is enabled, the transition blends over time.

## Risks / Trade-offs

- **[Risk]** Multiple states trying to control the same motion layer could conflict. → **Mitigation**: Each state specifies which layers it controls; layers not mentioned by a state are left untouched.
- **[Risk]** State profiles could become large and unwieldy. → **Mitigation**: Support profile inheritance (base profile + state-specific overrides).
- **[Risk]** Rapid state transitions could cause visual chaos. → **Mitigation**: Enforce a minimum time between transitions (debounce), configurable per state.

## Migration Plan

1. Create `runtime/behavior/` module
2. Define built-in states and their profiles
3. Integrate into `Model` lifecycle
4. Expose `Model.getBehaviorFSM()`

## Open Questions

- Should states support animation sequences (e.g., enter `happy` → wait 2s → auto-transition to `idle`)? (Future enhancement.)
- Should states be hot-reloadable from config? (Yes, useful for tweaking without rebuild.)

## Architecture

```
BehaviorFSM
├── states: Map<string, BehaviorState>
├── currentState: string
└── transitionTo(newState): void
    ├── validate transition (guard)
    ├── call currentState.onExit()
    ├── apply currentState.exitProfile (reverse effects)
    ├── call newState.onEnter()
    └── apply newState.entryProfile

BehaviorState
├── name: string
├── entryProfile: BehaviorProfile
├── exitProfile: BehaviorProfile (optional, to reverse effects)
├── onEnter?: (context) => void
├── onExit?: (context) => void
└── transitionGuard?: (from, to) => boolean

BehaviorProfile
├── motionLayers: Record<LayerName, { parameters, fadeIn }>
├── filters: EffectPreset[]
├── semanticParameters: Record<SemanticName, { value, blendMode }>
└── proceduralOverrides: { module, enabled }
```

## Specs

- `behavior-fsm`: Core FSM engine, state registry, transitions
- `behavior-profile`: Profile definition, application, reversal
- `state-transition-guards`: Guard evaluation, validation

## Tasks

### 1. Module Setup

- [ ] 1.1 Create `packages/live2d/src/runtime/behavior/` directory
- [ ] 1.2 Define TypeScript interfaces: `BehaviorFSM`, `BehaviorState`, `BehaviorProfile`, `TransitionGuard`
- [ ] 1.3 Define built-in states: idle, thinking, talking, embarrassed, angry, sleepy, happy, sad

### 2. Core FSM Implementation

- [ ] 2.1 Implement `BehaviorFSM` class with state registry
- [ ] 2.2 Implement `transitionTo()` with guard validation
- [ ] 2.3 Implement state entry/exit hooks
- [ ] 2.4 Implement `getCurrentState()` and `canTransitionTo()` query APIs
- [ ] 2.5 Implement transition debounce (minimum time between transitions)

### 3. Profile System

- [ ] 3.1 Implement `BehaviorProfile` application to MotionLayerSystem
- [ ] 3.2 Implement `BehaviorProfile` application to FilterPipeline
- [ ] 3.3 Implement `BehaviorProfile` application to SemanticParameterLayer
- [ ] 3.4 Implement profile reversal on state exit
- [ ] 3.5 Support profile inheritance (base + override)

### 4. Built-in States

- [ ] 4.1 Define `idle` state profile
- [ ] 4.2 Define `happy` state profile
- [ ] 4.3 Define `sad` state profile
- [ ] 4.4 Define `angry` state profile
- [ ] 4.5 Define `embarrassed` state profile (blush filter)
- [ ] 4.6 Define `thinking` state profile
- [ ] 4.7 Define `talking` state profile
- [ ] 4.8 Define `sleepy` state profile

### 5. Integration

- [ ] 5.1 Add `behaviorFSM` property to `Model` class
- [ ] 5.2 Initialize FSM in `Model` lifecycle after MotionLayerSystem
- [ ] 5.3 Expose `Model.getBehaviorFSM()` public accessor
- [ ] 5.4 Add `behaviorFSM` config to `Live2dConfig`

### 6. Testing

- [ ] 6.1 Unit test: State transition with valid guard
- [ ] 6.2 Unit test: State transition blocked by invalid guard
- [ ] 6.3 Unit test: Entry profile applied on state enter
- [ ] 6.4 Unit test: Exit profile applied on state exit
- [ ] 6.5 Unit test: Transition debounce prevents rapid switching
- [ ] 6.6 Unit test: Profile inheritance works correctly
- [ ] 6.7 Integration test: Full state cycle idle → happy → embarrassed → idle
