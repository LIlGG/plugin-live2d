## ADDED Requirements

### Requirement: Plugin SHALL render supported Live2D models through the maintained renderer
The plugin SHALL replace `pixi-live2d-display` with a maintained renderer integration that can load the plugin's configured Live2D assets for Cubism 2 / 3 / 4 / 5 models.

#### Scenario: Initial widget load uses the maintained renderer
- **WHEN** the widget initializes on a supported desktop page with a configured default model
- **THEN** the frontend runtime MUST create the Live2D scene with the maintained renderer stack
- **AND** the requested model asset from the existing backend `get` endpoint MUST be rendered in the canvas

### Requirement: Existing model interaction flows SHALL remain available after the renderer migration
The plugin SHALL preserve the current model interaction flows exposed by the widget runtime so that renderer replacement does not break end-user tools.

#### Scenario: Switching to another model keeps using the current backend contract
- **WHEN** a user triggers the switch-model tool
- **THEN** the frontend runtime MUST request the next model from the existing `switch` endpoint
- **AND** the returned model MUST replace the current model in the canvas without requiring a page reload

#### Scenario: Switching model textures keeps using the current backend contract
- **WHEN** a user triggers the switch-texture tool for a model that has alternate textures
- **THEN** the frontend runtime MUST request the next texture from the existing `rand_textures` endpoint
- **AND** the returned texture selection MUST be rendered on the current model canvas

#### Scenario: Capturing a screenshot remains available
- **WHEN** a user triggers the screenshot tool after a model has loaded
- **THEN** the runtime MUST export the current canvas content as an image download

### Requirement: Renderer migration SHALL not require a new server-side model metadata API
The renderer migration SHALL work with the plugin's current server-side model loading endpoints and injected configuration contract.

#### Scenario: Existing initialization contract remains sufficient
- **WHEN** the frontend runtime receives the same injected config fields used by the current widget
- **THEN** it MUST determine the initial model and texture selection without requiring additional backend metadata fields
- **AND** it MUST continue loading the model through the current API path conventions
