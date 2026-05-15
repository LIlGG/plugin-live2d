## MODIFIED Requirements

### Requirement: Renderer migration SHALL not require a new server-side model metadata API
The renderer migration SHALL continue working with the plugin's current server-side model loading endpoints while allowing Halo to bootstrap the runtime through a modern frontend entry and public config contract.

#### Scenario: Modern Halo bootstrap remains sufficient for initial model selection
- **WHEN** the frontend runtime starts from the Halo plugin's modern bootstrap entry with the backend-provided public config payload
- **THEN** it MUST determine the initial model and texture selection without requiring an additional backend metadata endpoint
- **AND** it MUST continue loading models through the existing API path conventions
