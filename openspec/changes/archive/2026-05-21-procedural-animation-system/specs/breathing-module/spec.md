## ADDED Requirements

### Requirement: Generate sine-wave breathing motion
The module SHALL produce a continuous sine-wave value for the `breath` semantic parameter.

#### Scenario: Breathing cycle
- **WHEN** the module is active
- **THEN** the `breath` parameter oscillates in a smooth sine wave with a period of approximately 3 seconds

### Requirement: Configurable breathing frequency and amplitude
The module SHALL accept configuration for breathing frequency (period in seconds) and amplitude (max parameter offset).

#### Scenario: Custom breathing settings
- **WHEN** the module is configured with `period: 4000` and `amplitude: 0.2`
- **THEN** the breathing cycle completes every 4 seconds
- **AND** the parameter offset ranges from `0` to `0.2`

### Requirement: Disable when breath parameter unavailable
If the model does not have a resolvable `breath` semantic, the module SHALL silently become a no-op.

#### Scenario: Missing breath parameter
- **WHEN** `CapabilityProfile` reports `breath` as missing
- **THEN** the breathing module does not attempt to set any parameter
