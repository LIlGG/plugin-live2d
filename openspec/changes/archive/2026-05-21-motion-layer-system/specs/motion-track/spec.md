## ADDED Requirements

### Requirement: Independent playback per track
Each `MotionTrack` SHALL maintain its own playback state independently of other tracks.

#### Scenario: Concurrent playback
- **WHEN** the `idle` track is playing an idle motion
- **AND** the `talk` track begins playing a talk motion
- **THEN** both tracks continue playing simultaneously

### Requirement: Track priority system
Each track SHALL have a priority level. Higher priority tracks override lower priority tracks on conflicting parameters.

#### Scenario: Gesture overrides idle head movement
- **WHEN** the `idle` track is affecting `angleX` at priority 1
- **AND** the `gesture` track begins affecting `angleX` at priority 4
- **THEN** the `gesture` track's value takes precedence for `angleX`

### Requirement: Interruptible flag
A track SHALL support an `interruptible` flag. If `false`, the track cannot be stopped by lower-priority incoming tracks.

#### Scenario: Non-interruptible expression
- **WHEN** an expression track is playing with `interruptible: false`
- **AND** a lower-priority motion attempts to play on the same layer
- **THEN** the new motion is queued or rejected, not interrupting the current one

### Requirement: Track lifecycle states
A track SHALL have states: `idle`, `fadingIn`, `active`, `fadingOut`, `stopped`.

#### Scenario: Track state transitions
- **WHEN** a motion starts playing
- **THEN** the track transitions from `idle` → `fadingIn` → `active`
- **AND** when the motion ends or is stopped, it transitions `active` → `fadingOut` → `stopped`
