# emotion-timeline Specification

## Purpose
TBD - created by archiving change emotion-timeline. Update Purpose after archive.
## Requirements
### Requirement: Transition between named emotions
The system SHALL support `transitionTo(emotion, duration?, easing?)` to interpolate from the current emotional state to a target emotion.

#### Scenario: Neutral to happy transition
- **WHEN** `transitionTo("happy", 800)` is called from `neutral`
- **THEN** over 800ms, all parameters smoothly interpolate from neutral values to happy values

#### Scenario: Default duration
- **WHEN** `transitionTo("happy")` is called without specifying duration
- **THEN** the default duration (500ms) is used

### Requirement: Enforce minimum transition duration
The system SHALL enforce a minimum transition duration (default 300ms) to prevent jitter.

#### Scenario: Too-short duration is clamped
- **WHEN** `transitionTo("happy", 50)` is called
- **THEN** the actual transition duration is clamped to 300ms

### Requirement: Support transition interrupt
A new `transitionTo()` call during an ongoing transition SHALL use the current interpolated values as the new starting point.

#### Scenario: Interrupt mid-transition
- **WHEN** a transition from `neutral` to `happy` is at 50% (halfway)
- **AND** `transitionTo("sad")` is called
- **THEN** the new transition starts from the current halfway values toward `sad`

