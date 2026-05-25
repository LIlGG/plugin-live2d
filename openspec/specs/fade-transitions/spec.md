# fade-transitions Specification

## Purpose
TBD - created by archiving change motion-layer-system. Update Purpose after archive.
## Requirements
### Requirement: Fade-in on motion start
When a motion begins playing, the track SHALL optionally fade in from weight `0` to weight `1` over a configurable duration.

#### Scenario: Smooth fade in
- **WHEN** `play({ layer: "talk", fadeIn: 300 })` is called
- **THEN** over 300ms, the talk track's weight increases from `0` to `1`

### Requirement: Fade-out on motion end
When a motion ends or is stopped, the track SHALL optionally fade out from weight `1` to weight `0`.

#### Scenario: Smooth fade out
- **WHEN** a track with `fadeOut: 200` stops playing
- **THEN** over 200ms, the track's weight decreases from `1` to `0`

### Requirement: Crossfade between consecutive motions
When a new motion replaces an existing motion on the same layer, the system SHALL support crossfade: the old motion fades out while the new one fades in.

#### Scenario: Expression crossfade
- **WHEN** expression A is active
- **AND** expression B is played on the same layer with crossfade
- **THEN** expression A fades out while expression B fades in

### Requirement: Configurable fade curve
The fade curve SHALL be configurable: `linear`, `easeIn`, `easeOut`, `easeInOut`.

#### Scenario: Ease-in fade
- **WHEN** `play({ fadeIn: 500, fadeCurve: "easeIn" })` is called
- **THEN** the fade starts slowly and accelerates

