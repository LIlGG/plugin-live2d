## ADDED Requirements

### Requirement: Trigger random-interval blinks
The module SHALL trigger eye blinks at random intervals within a configurable range.

#### Scenario: Random blink timing
- **WHEN** the module is configured with interval range `[2000, 6000]` ms
- **THEN** blinks occur at random times, no sooner than 2s and no later than 6s apart

### Requirement: Animate blink with natural curve
Each blink SHALL animate the `eyeLOpen` and `eyeROpen` parameters from open (`1`) to closed (`0`) and back to open over approximately 150ms.

#### Scenario: Blink animation curve
- **WHEN** a blink starts at time `T`
- **THEN** at `T+75ms`, both eye parameters are near `0`
- **AND** at `T+150ms`, both parameters return to `1`

### Requirement: Disable when model has native auto-blink
If the model's native settings have auto-blink enabled, the procedural blink module SHALL disable itself to avoid conflict.

#### Scenario: Native auto-blink detected
- **WHEN** the loaded model has `autoBlink: true` in its settings
- **THEN** the procedural blink module does not activate

### Requirement: Configurable blink duration
The module SHALL support configuring the duration of each blink animation.

#### Scenario: Slow blink
- **WHEN** the module is configured with `duration: 300`
- **THEN** each blink takes 300ms from open to closed to open
