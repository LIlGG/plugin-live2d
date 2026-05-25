# emotion-registry Specification

## Purpose
TBD - created by archiving change emotion-timeline. Update Purpose after archive.
## Requirements
### Requirement: Built-in emotion registry
The system SHALL ship with a default registry mapping 8 emotion names to semantic parameter target values.

#### Scenario: Built-in emotions exist
- **WHEN** the system initializes
- **THEN** emotions `neutral`, `happy`, `sad`, `angry`, `shy`, `surprised`, `sleepy`, and `embarrassed` are registered

### Requirement: Register custom emotions
The system SHALL support registering custom emotions at runtime.

#### Scenario: Custom emotion
- **WHEN** `registerEmotion("excited", { eyeSmile: 0.9, mouthOpen: 0.6 })` is called
- **THEN** `transitionTo("excited")` uses the registered parameter targets

### Requirement: Emotion maps to filter preset
Each emotion SHALL optionally specify a filter preset.

#### Scenario: Happy emotion with warm glow
- **WHEN** `happy` emotion specifies `filterPreset: "happy-glow"`
- **AND** `transitionTo("happy")` is called
- **THEN** the filter preset is applied during the transition

