## ADDED Requirements

### Requirement: Full tips sources SHALL fall back to the bundled defaults when unavailable
The runtime SHALL continue using plugin tips and theme tips, but it MUST fall back to the bundled full tips file when a configured full tips source cannot be loaded or parsed.

#### Scenario: Missing custom tips file falls back to bundled defaults
- **WHEN** `tipsPath` is configured and the referenced resource cannot be fetched successfully
- **THEN** the runtime MUST load the bundled `live2d-tips.json` file as the full tips source
- **AND** plugin-level and theme-level tips MUST still be merged with that fallback source using the existing priority order

#### Scenario: Invalid custom tips file falls back to bundled defaults
- **WHEN** `tipsPath` points to a resource whose response cannot be parsed into the expected tips structure
- **THEN** the runtime MUST ignore that invalid full tips source
- **AND** it MUST continue initialization with the bundled default full tips file
