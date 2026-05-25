## Context

plugin-live2d now has five independently-operating runtime subsystems:
- `BehaviorFSM` — high-level behavioral states (idle, talking, happy...)
- `EmotionTimeline` — smooth parameter interpolation between emotions
- `MotionLayerSystem` — parallel animation tracks on named layers
- `FilterPipeline` — per-model visual effects (blush, glow, color grading)
- `ProceduralAnimationSystem` — continuous animations (breathing, blinking, eye tracking)
- `SemanticParameterLayer` — unified semantic parameter access

Each is initialized separately in `Model.loadModel()`, owns its own resources, and writes to the semantic layer independently. There is no coordination layer. A developer running `pnpm dev` sees the Live2D model with breathing/blinking (procedural system), but has no way to observe or trigger the other four systems.

## Goals / Non-Goals

**Goals:**
- Create a single `Live2dRuntimeController` that owns and coordinates all runtime subsystems
- Provide a unified public API for external consumers (AI hooks, chat reactions, manual triggers)
- Build a developer-only floating panel showing real-time system status
- Enable manual triggering of states, emotions, filters, and motions from the panel
- Detect and resolve cross-system parameter conflicts

**Non-Goals:**
- Not a production-facing UI (dev-only, tree-shaken in prod builds)
- Not replacing individual system APIs (controller delegates, doesn't wrap)
- Not a full animation sequencer with keyframes
- Not persisting debug state across page reloads

## Decisions

### Controller owns subsystem lifecycle

`Live2dRuntimeController` is instantiated in `Model.loadModel()` after the Pixi app is ready. It creates all subsystems internally and exposes them via getters. `Model` delegates to the controller instead of directly owning `#behaviorFSM`, `#emotionTimeline`, etc.

**Alternative**: Keep direct Model ownership and add controller as a thin wrapper. **Rejected** because Model is already cluttered with 6 private fields for runtime systems. Centralizing ownership simplifies Model and makes the relationship explicit.

### DevTools is a standalone React/Lit component

The panel is a web component (`<live2d-dev-tools>`) rendered as a sibling to `<live2d-widget>`. It consumes the controller via a context or direct reference. It only renders when `import.meta.env.DEV` is true.

**Alternative**: Build into Live2dTools (the existing user-facing toolbar). **Rejected** because the existing toolbar is user-facing (screenshot, switch model, etc.) and should not expose runtime internals.

### Conflict resolution: priority-based last-write-wins

When two systems target the same semantic parameter, the controller resolves conflicts by priority:
1. Manual override (dev tools slider) — highest
2. Behavior FSM state profiles
3. Emotion Timeline transitions
4. Motion Layer System (expression layer)
5. Procedural Animation System — lowest

Each frame, the controller collects all pending parameter writes, sorts by priority, and applies the highest-priority value.

**Alternative**: Blend all contributions mathematically. **Rejected** because different systems use different blend semantics (override vs add) and blending them all would produce unpredictable results. Priority is simpler and debuggable.

### DevTools panel layout: accordion sections

The panel is divided into collapsible sections, one per subsystem:
- **Behavior FSM**: Current state, transition history, state buttons
- **Emotion Timeline**: Current emotion, transition progress bar, emotion buttons
- **Motion Layers**: Layer status table (active/stopped, weight, priority)
- **Filter Pipeline**: Active effects list with intensity sliders
- **Semantic Parameters**: Live parameter value grid
- **Procedural**: Module toggle switches (breathing, blink, eye tracking)

**Alternative**: Tabbed layout. **Rejected** because accordion allows seeing multiple systems at once, which is useful for understanding interactions.

### DevTools toggle: keyboard shortcut + corner indicator

- `Ctrl+Shift+D` toggles panel visibility
- A small `🔧` indicator in the bottom-right corner shows panel is available
- Panel position is draggable and remembers position in `localStorage`

## Risks / Trade-offs

- **[Risk]** Controller adds abstraction overhead between Model and subsystems. → **Mitigation**: Controller is a thin coordinator; subsystems retain their full APIs. No performance-critical path goes through the controller.
- **[Risk]** DevTools bundle size in production even if tree-shaken. → **Mitigation**: DevTools is in a separate entry file (`Demo.tsx` imports it, production entry `index.ts` does not). Verified by analyzing build output.
- **[Risk]** Conflict resolution hides bugs by silently suppressing parameter writes. → **Mitigation**: DevTools shows suppressed writes in a "conflict log" section with reason (which system won and why).
- **[Risk]** Developers may accidentally ship with DevTools enabled. → **Mitigation**: Guard every render with `import.meta.env.DEV`. Add an eslint rule forbidding `Live2dDevTools` import outside dev entry.

## Migration Plan

1. Create `Live2dRuntimeController` and move subsystem initialization from Model
2. Refactor Model to use controller getters
3. Create DevTools component with basic status display
4. Add manual trigger buttons
5. Add conflict resolution logging
6. Verify DevTools does not appear in production build

Rollback: Revert Model to direct subsystem ownership. Controller and DevTools are purely additive.

## Open Questions

- Should the controller expose an event bus for cross-system communication (e.g. FSM entering "talking" automatically triggers a "speaking" emotion)?
- Should DevTools support recording/replaying interaction sequences for regression testing?
