## ADDED Requirements

### Requirement: Guard functions prevent invalid transitions
The system SHALL support guard functions that return `boolean` to allow or block a transition.

#### Scenario: Guard blocks transition
- **WHEN** a transition from `talking` to `sleepy` has a guard requiring `!isSpeaking`
- **AND** `isSpeaking` is `true`
- **THEN** `transitionTo("sleepy")` returns `false` and no transition occurs

#### Scenario: Guard allows transition
- **WHEN** a transition guard returns `true`
- **THEN** `transitionTo()` returns `true` and the transition succeeds

### Requirement: Query if transition is possible
The system SHALL provide `canTransitionTo(target)` to check if a transition would succeed without executing it.

#### Scenario: Check transition validity
- **WHEN** `canTransitionTo("sleepy")` is called while speaking
- **THEN** it returns `false`
