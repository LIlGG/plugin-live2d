## ADDED Requirements

### Requirement: Publish-subscribe command dispatch
The `AiCommandBus` SHALL support publishing commands and subscribing handlers by command type. Multiple subscribers SHALL receive each matching command.

#### Scenario: Subscribe and receive emotion command
- **WHEN** a handler subscribes to command type `"emotion"`
- **AND** a command `{ type: "emotion", emotion: "happy", intensity: 0.8 }` is published
- **THEN** the handler receives the command

#### Scenario: Multiple subscribers for same type
- **WHEN** two handlers subscribe to command type `"lipSync"`
- **AND** a lip sync command is published
- **THEN** both handlers receive the command

### Requirement: Support command types
The command bus SHALL support at minimum these command types: `emotion`, `lipSync`, `motion`, `filter`.

#### Scenario: Motion command dispatch
- **WHEN** a command `{ type: "motion", layer: "gesture", motion: "nod" }` is published
- **THEN** the Motion Layer subscriber receives and processes it

### Requirement: Commands carry timing metadata
Every command SHALL carry an `estimatedTime` field representing the estimated display time offset from the start of the AI response.

#### Scenario: Lip sync timing
- **WHEN** a lip sync command with `estimatedTime: 1200` is published
- **THEN** the Lip Sync subscriber schedules the mouth shape change at 1200ms from response start

### Requirement: Async-safe publishing
The command bus SHALL handle commands published during an active transition without dropping or corrupting state.

#### Scenario: Rapid emotion changes
- **WHEN** three emotion commands are published within 50ms
- **THEN** all three are queued and processed in order by the Emotion Timeline
