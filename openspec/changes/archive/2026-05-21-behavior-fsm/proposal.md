## Why

Current Live2D models have no high-level behavioral concept. They play motions and expressions independently without a unifying state that describes "what the character is doing right now." A Behavior FSM (Finite State Machine) introduces states like `idle`, `thinking`, `talking`, `embarrassed`, `sleepy` — each mapping to a coherent combination of motion layers, expression parameters, and filter effects. This provides a declarative way to drive complex multi-system behavior from a single state transition.

## What Changes

- Introduce `BehaviorFSM` class with states, transitions, and transition guards
- Define built-in states: `idle`, `thinking`, `talking`, `embarrassed`, `angry`, `sleepy`, `happy`, `sad`
- Each state maps to a `BehaviorProfile`: which motion layers to activate, which semantic parameters to set, which filters to apply
- Support state entry/exit hooks for custom logic
- Support transition conditions (guards) that prevent invalid state changes
- Integrate with MotionLayerSystem (states play on specific layers) and FilterPipeline (states apply mood effects)
- Expose `transitionTo(state)` API that automatically manages motion layer playback and filter application

## Capabilities

### New Capabilities
- `behavior-fsm`: Finite state machine for high-level character behavior states
- `behavior-profile`: Per-state configuration mapping states to motion/filter/parameter effects
- `state-transition-guards`: Conditional transition rules preventing invalid state changes

### Modified Capabilities
- `motion-layer-system`: States will use `play()` on specific motion layers when entering a state
- `runtime-filter-pipeline`: States will apply/change presets via `applyPreset()` on entry

## Impact

- **Frontend runtime**: New `packages/live2d/src/runtime/behavior/` directory
- **Motion layer system**: Used by FSM to play motions on state entry
- **Filter pipeline**: Used by FSM to apply mood presets on state entry
- **Semantic parameter layer**: Used by FSM to set expression parameters on state entry
- **Model class**: Gains `behaviorFSM` property when initialized
