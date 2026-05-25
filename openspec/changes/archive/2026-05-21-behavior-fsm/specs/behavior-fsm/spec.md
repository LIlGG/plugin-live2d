## ADDED Requirements

### Requirement: Register named behavior states
The system SHALL support registering named behavior states, each with an optional entry profile, exit profile, entry hook, exit hook, and transition guard.

#### Scenario: Register idle state
- **WHEN** a state named `idle` is registered with an entry profile
- **THEN** the state is stored and can be transitioned to

### Requirement: Transition between states
The system SHALL support transitioning from the current state to a target state via `transitionTo(target)`.

#### Scenario: Valid transition
- **WHEN** the current state is `idle`
- **AND** `transitionTo("happy")` is called
- **THEN** the current state becomes `happy`

#### Scenario: Same-state transition is a no-op
- **WHEN** the current state is `idle`
- **AND** `transitionTo("idle")` is called
- **THEN** no transition occurs

