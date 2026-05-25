## ADDED Requirements

### Requirement: Schedule and execute transitions
The system SHALL manage a transition queue and execute the active transition each frame.

#### Scenario: Active transition updates
- **WHEN** a transition is active with duration 500ms
- **AND** 250ms have elapsed
- **THEN** all affected parameters are at approximately 50% between start and target

### Requirement: Auto-return to neutral after idle
The system SHALL automatically transition back to `neutral` after a configurable idle timeout.

#### Scenario: Auto-return
- **WHEN** `transitionTo("happy")` is called with the happy profile specifying `idleTimeout: 2000`
- **AND** no new transition occurs for 2000ms
- **THEN** the system automatically transitions back to `neutral`

#### Scenario: Disable auto-return
- **WHEN** an emotion profile specifies `idleTimeout: null`
- **THEN** the system does not auto-return to neutral

### Requirement: Transition completion callback
The system SHALL support an optional callback invoked when a transition completes.

#### Scenario: Callback on completion
- **WHEN** `transitionTo("happy", 500, undefined, onComplete)` is called
- **AND** the transition completes
- **THEN** `onComplete` is invoked
