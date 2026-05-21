## ADDED Requirements

### Requirement: Follow cursor position by default
The module SHALL track the mouse/touch position and drive `angleX`, `angleY`, `eyeBallX`, and `eyeBallY` semantic parameters to make the model look toward the cursor.

#### Scenario: Cursor in upper-right
- **WHEN** the cursor is at the upper-right of the canvas
- **THEN** `angleX` and `eyeBallX` increase (look right)
- **AND** `angleY` and `eyeBallY` decrease (look up)

### Requirement: Smooth movement with exponential interpolation
The module SHALL smooth target transitions using exponential decay to avoid jarring jumps.

#### Scenario: Rapid cursor movement
- **WHEN** the cursor jumps from left to right instantly
- **THEN** the model's head and eyes smoothly follow over approximately 200ms

### Requirement: Accept programmatic gaze targets
The module SHALL accept a normalized `(x, y)` target in `[-1, 1]` range from sources other than mouse input.

#### Scenario: AI-directed gaze
- **WHEN** `setTarget(0.5, -0.3)` is called programmatically
- **THEN** the model smoothly looks toward the specified direction
- **AND** mouse input is temporarily overridden until explicitly released

### Requirement: Disable tracking when cursor leaves canvas
When the cursor leaves the Live2D canvas area, the module SHALL gradually return the gaze to center (`0, 0`) instead of snapping.

#### Scenario: Cursor leave
- **WHEN** the mouse moves off the canvas
- **THEN** over approximately 500ms, all tracked parameters return to their default values

### Requirement: Configurable tracking range
The module SHALL support configuring the maximum angle and eyeball offset ranges.

#### Scenario: Limited head movement
- **WHEN** configured with `maxAngleX: 15` and `maxEyeBallX: 1.0`
- **THEN** `angleX` ranges from `-15` to `15`
- **AND** `eyeBallX` ranges from `-1.0` to `1.0`
