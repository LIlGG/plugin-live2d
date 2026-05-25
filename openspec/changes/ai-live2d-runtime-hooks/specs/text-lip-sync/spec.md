## ADDED Requirements

### Requirement: Generate lip sync frames from text stream
The system SHALL generate a sequence of lip sync frames from incoming text chunks, where each frame specifies a mouth shape value and duration.

#### Scenario: Simple text lip sync
- **WHEN** the text chunk `"hello"` arrives
- **THEN** the system generates frames that open the mouth during characters and briefly close at the end

### Requirement: Map text patterns to mouth shapes
The system SHALL use a simple heuristic mapping: alphabetic characters → open mouth, whitespace/punctuation → closed or partially open mouth.

#### Scenario: Punctuation causes mouth close
- **WHEN** the text chunk `"Hi! How are you?"` arrives
- **THEN** the mouth closes at `!`, opens at `H`, closes at ` `, opens at `a`, etc.

### Requirement: Synchronize with text display timing
The generated lip sync frames SHALL align with the estimated text display timing so the model's mouth movements appear synchronized with the text streaming onto screen.

#### Scenario: Timing alignment
- **WHEN** text chunks arrive with delays of 100-200ms between them
- **THEN** the lip sync frames are paced to match those delays

### Requirement: Graceful fallback when mouth parameter unavailable
If the current model does not expose a mouth-related semantic parameter, the lip sync system SHALL silently disable itself without errors.

#### Scenario: Missing mouth parameter
- **WHEN** `SemanticLayer.hasSemantic("mouthOpen")` returns `false`
- **THEN** lip sync frames are generated but not applied to the model
