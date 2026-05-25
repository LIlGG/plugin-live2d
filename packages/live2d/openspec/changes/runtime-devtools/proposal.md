## Why

plugin-live2d has built five runtime subsystems (Behavior FSM, Emotion Timeline, Motion Layer System, Filter Pipeline, Procedural Animation, Semantic Parameter Layer), but they operate in isolation. Developers cannot see what each system is doing, cannot manually trigger state changes for testing, and have no single point of control. Without visibility and manual triggers, these systems might as well not exist from a development or debugging perspective.

## What Changes

- Introduce `Live2dRuntimeController` — a centralized coordinator that owns all runtime subsystems and exposes a unified control API
- Create a developer-only `RuntimeDevTools` floating panel (React/Lit component) visible only in `import.meta.env.DEV`
- Panel displays real-time status of all runtime systems (current FSM state, active emotion, motion layers, filters, semantic params)
- Panel provides manual trigger buttons for FSM states, emotions, filter presets, and motion layers
- Panel shows live parameter value readouts with progress bars for transitions
- Runtime controller prevents cross-system conflicts (e.g. FSM and Timeline fighting for the same parameter)
- DevTools toggles via `Ctrl+Shift+D` or a small corner indicator

## Capabilities

### New Capabilities
- `runtime-controller`: Centralized ownership and coordination of all runtime subsystems
- `runtime-devtools`: Developer-only floating panel for state visibility and manual triggering
- `runtime-conflict-resolution`: Cross-system parameter conflict detection and resolution rules

### Modified Capabilities
- `behavior-fsm`: Will register with controller instead of direct Model ownership
- `emotion-timeline`: Will register with controller instead of direct Model ownership
- `runtime-filter-pipeline`: Will register with controller instead of direct Model ownership
- `motion-layer-system`: Will register with controller instead of direct Model ownership
- `procedural-animation-system`: Will register with controller instead of direct Model ownership

## Impact

- **Frontend runtime**: New `packages/live2d/src/runtime/controller/` directory
- **Dev tools UI**: New `packages/live2d/src/components/Live2dDevTools/` directory
- **Model class**: Refactored to delegate runtime initialization to controller instead of direct ownership
- **Build**: DevTools component is tree-shaken in production builds (dev-only import)
- **Config**: `Live2dConfig` gains `devTools` option for panel positioning and feature toggles
