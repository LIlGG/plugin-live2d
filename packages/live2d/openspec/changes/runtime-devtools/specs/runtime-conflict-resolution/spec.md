## ADDED Requirements

### Requirement: Detect cross-system parameter conflicts
The system SHALL detect when multiple runtime systems attempt to write to the same semantic parameter within the same frame.

#### Scenario: FSM and Timeline target same parameter
- **WHEN** the FSM sets `mouthSmile: 0.5` and the EmotionTimeline sets `mouthSmile: 0.8` in the same frame
- **THEN** the controller detects a conflict on `mouthSmile`

### Requirement: Resolve conflicts by priority
The system SHALL resolve conflicts using a defined priority order.

#### Scenario: Higher priority wins
- **WHEN** ProceduralAnimation (priority 5) writes `breath: 0.1`
- **AND** EmotionTimeline (priority 3) writes `breath: 0.3`
- **THEN** the effective value is `breath: 0.3` (EmotionTimeline wins)

#### Scenario: Manual override has highest priority
- **WHEN** a dev tools slider manually sets `eyeLOpen: 0.5`
- **AND** any other system writes a different value to `eyeLOpen`
- **THEN** the manual value `0.5` is applied

### Requirement: Log suppressed writes for debugging
The system SHALL record which writes were suppressed and why.

#### Scenario: Conflict log entry
- **WHEN** a conflict occurs and the EmotionTimeline wins
- **THEN** a log entry is created showing: parameter name, losing system, winning system, both values

#### Scenario: DevTools displays conflict log
- **WHEN** the DevTools panel is open
- **AND** conflicts have occurred
- **THEN** a "Conflict Log" section displays all recent conflicts with timestamps
