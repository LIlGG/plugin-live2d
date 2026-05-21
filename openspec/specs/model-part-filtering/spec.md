# model-part-filtering Specification

## Purpose
TBD - created by archiving change runtime-filter-pipeline. Update Purpose after archive.
## Requirements
### Requirement: Target filters to specific model parts
When the engine exposes drawable access, the system SHALL support applying filters to specific parts of the model by drawable name pattern.

#### Scenario: Eye glow effect
- **WHEN** a glow filter is configured with target pattern `/eye/i`
- **AND** the model has drawables named `eyeL` and `eyeR`
- **THEN** the glow is applied only to the eye drawables

### Requirement: Fallback to full-model filtering
If part-level targeting is not supported by the engine or no drawables match the pattern, the filter SHALL apply to the entire model.

#### Scenario: Pattern mismatch fallback
- **WHEN** a filter targets pattern `/nonexistent/i`
- **AND** no drawables match
- **THEN** the filter applies to the entire model

### Requirement: Part filtering does not affect other drawables
When a filter targets a specific part, other drawables SHALL render without that filter.

#### Scenario: Isolated part effect
- **WHEN** a blush filter targets only drawable `cheekL`
- **THEN** `cheekL` renders with blush
- **AND** all other drawables render normally

