## ADDED Requirements

### Requirement: Discrete emotional states with intensity
The system SHALL maintain a single active emotional state consisting of a named emotion and an intensity value in the range [0, 1].

#### Scenario: Set emotion state
- **WHEN** the emotion timeline receives `{ emotion: "happy", intensity: 0.8 }`
- **THEN** the active state becomes `happy` at intensity `0.8`

### Requirement: Smooth parameter interpolation between emotions
The system SHALL interpolate semantic parameter values between the outgoing and incoming emotional states over a configurable duration.

#### Scenario: Transition from neutral to happy
- **WHEN** the current state is `neutral` and a transition to `happy` with duration `800ms` is requested
- **THEN** over the next 800ms, the model's expression parameters smoothly blend from neutral values to happy values

### Requirement: Minimum transition duration
The system SHALL enforce a minimum transition duration of 300ms to prevent visual jitter from rapid emotion changes.

#### Scenario: Rapid successive emotions
- **WHEN** an emotion change is requested while another transition is in progress
- **AND** the remaining time of the current transition is less than 300ms
- **THEN** the system extends or completes the current transition before starting the new one

### Requirement: Emotion parameter mapping registry
The system SHALL use a configurable mapping from emotion names to sets of semantic parameter values.

#### Scenario: Happy emotion parameters
- **WHEN** the "happy" emotion is mapped to `{ mouthOpen: 0.3, eyeSmile: 0.7, cheek: 0.4 }`
- **AND** the emotion timeline transitions to "happy"
- **THEN** those semantic parameters are driven to the mapped values via the Semantic Parameter Layer

### Requirement: Auto-return to idle
The system SHALL automatically transition back to a configurable default emotion (typically "neutral") after a configurable idle timeout following the last emotion command.

#### Scenario: Return to idle after timeout
- **WHEN** the idle timeout is configured to 2000ms
- **AND** no new emotion command arrives within 2000ms after the last one
- **THEN** the system transitions back to the default emotion
