## ADDED Requirements

### Requirement: Register and update procedural modules
The system SHALL support registering `ProceduralModule` instances that receive per-frame updates via the Pixi ticker.

#### Scenario: Register breathing module
- **WHEN** a `BreathingModule` is registered with the system
- **AND** the Pixi ticker advances by 16ms
- **THEN** the module's `update(dt, parameterSet)` method is called with `dt = 16`

### Requirement: Accumulate parameter changes from all modules
After all modules update, the system SHALL resolve and apply accumulated semantic parameter changes to the model.

#### Scenario: Multiple modules target same parameter
- **WHEN** `BreathingModule` writes `angleX: 2` with `add` blend mode
- **AND** `EyeTrackingModule` writes `angleX: 15` with `override` blend mode
- **THEN** the final `angleX` value is `15` (override wins)

### Requirement: Support one-shot procedural animations
The system SHALL support registering temporary one-shot animations that auto-unregister on completion.

#### Scenario: Head nod animation
- **WHEN** `animate({ target: 'angleX', to: 10, duration: 300, easing: 'easeOut' })` is called
- **THEN** over 300ms, `angleX` smoothly animates from current value to `10`
- **AND** the animation auto-unregisters after completion

### Requirement: Cap delta time to prevent large jumps
The system SHALL cap `dt` passed to modules at 100ms to prevent visual jumps when the tab is backgrounded or frame rate drops.

#### Scenario: Tab backgrounded
- **WHEN** the user switches tabs for 5 seconds
- **AND** returns to the tab
- **THEN** the next update uses `dt = 100` (capped), not `5000`

### Requirement: Attach and detach with model lifecycle
The system SHALL attach to the Pixi ticker when the model is ready and detach when the model is destroyed.

#### Scenario: Model destroy cleanup
- **WHEN** `model.destroy()` is called
- **THEN** the procedural system's ticker callback is removed
- **AND** all modules are cleared
