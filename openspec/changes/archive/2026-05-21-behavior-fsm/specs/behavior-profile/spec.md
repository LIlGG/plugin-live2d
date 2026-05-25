## ADDED Requirements

### Requirement: BehaviorProfile maps to runtime systems
A `BehaviorProfile` SHALL define effects on motion layers, filters, and semantic parameters.

#### Scenario: Profile with motion layer parameters
- **WHEN** a profile specifies `{ talk: { mouthOpen: 0.8 } }`
- **AND** the profile is applied
- **THEN** `motionLayerSystem.play({ layer: "talk", parameters: { mouthOpen: 0.8 } })` is called

#### Scenario: Profile with filter preset
- **WHEN** a profile specifies `filters: ["happy-glow"]`
- **AND** the profile is applied
- **THEN** `filterPipeline.applyPreset("happy-glow")` is called

### Requirement: Profile reversal on state exit
The system SHALL support reversing a profile's effects on state exit.

#### Scenario: Stop motion on exit
- **WHEN** a state with a talk layer motion is exited
- **THEN** the talk layer is stopped with fade out

### Requirement: Profile inheritance
Profiles SHALL support inheritance from a base profile with state-specific overrides.

#### Scenario: Inherit and override
- **WHEN** a base profile sets `idle: { breath: 0.1 }`
- **AND** a state profile inherits the base and overrides `idle: { breath: 0.2 }`
- **THEN** the effective profile uses `breath: 0.2`
