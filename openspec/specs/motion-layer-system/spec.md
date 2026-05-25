# motion-layer-system Specification

## Purpose
TBD - created by archiving change motion-layer-system. Update Purpose after archive.
## Requirements
### Requirement: Support named motion layers
The system SHALL support at minimum these named layers: `idle`, `expression`, `talk`, `gesture`, `physics`.

#### Scenario: Create layers on initialization
- **WHEN** the `MotionLayerSystem` is initialized
- **THEN** all 5 standard layers are created with default priorities

### Requirement: Play motion on a specific layer
The system SHALL provide a `play()` method that accepts `layer`, `motion`, `priority`, `fadeIn`, and `blend` options.

#### Scenario: Play motion on talk layer
- **WHEN** `play({ layer: "talk", motion: greetingMotion, priority: 3 })` is called
- **THEN** the talk layer begins playing the motion

### Requirement: Query layer state
The system SHALL provide methods to inspect the current state of each layer.

#### Scenario: Check if layer is active
- **WHEN** `isPlaying("talk")` is called while the talk layer has an active motion
- **THEN** it returns `true`

#### Scenario: List active layers
- **WHEN** `getActiveLayers()` is called while idle and talk layers are active
- **THEN** it returns `["idle", "talk"]`

