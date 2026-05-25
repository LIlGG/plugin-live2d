# cross-layer-blending Specification

## Purpose
TBD - created by archiving change motion-layer-system. Update Purpose after archive.
## Requirements
### Requirement: Override blend mode
When a higher-priority track uses `blend: "override"` on a parameter, it SHALL replace the value from all lower-priority tracks.

#### Scenario: Gesture override
- **WHEN** the `gesture` layer (priority 4) sets `angleX` to 20 with `override`
- **AND** the `idle` layer (priority 1) sets `angleX` to 5
- **THEN** the final `angleX` value is 20

### Requirement: Add blend mode
When multiple tracks use `blend: "add"` on the same parameter, their values SHALL be summed.

#### Scenario: Physics叠加
- **WHEN** the `physics` layer adds `0.1` to `breath`
- **AND** another layer also adds `0.05` to `breath`
- **THEN** the final `breath` value includes `0.15` from add layers

### Requirement: Blend weight normalization
When multiple `add` layers target the same parameter, the system SHALL normalize their weights if the sum exceeds a safe threshold.

#### Scenario: Weight normalization
- **WHEN** three layers each add `1.0` to the same parameter
- **THEN** the system normalizes so the total add contribution does not exceed `1.0`

