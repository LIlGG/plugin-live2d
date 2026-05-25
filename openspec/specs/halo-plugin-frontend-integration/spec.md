# halo-plugin-frontend-integration Specification

## Purpose
TBD - created by archiving change integrate-modern-live2d-frontend. Update Purpose after archive.
## Requirements
### Requirement: Halo pages SHALL bootstrap the modern Live2D frontend bundle
The plugin SHALL initialize the widget on Halo pages through the maintained frontend bundle instead of the legacy `live2d-autoload` script.

#### Scenario: Production pages load the packaged frontend entry
- **WHEN** a Halo page includes the Live2D plugin in a production build
- **THEN** the backend MUST emit the modern frontend bootstrap entry from the plugin's packaged static assets
- **AND** the page MUST no longer depend on `static/js/live2d-autoload.min.js` for widget startup

#### Scenario: Frontend bundle starts the existing widget runtime
- **WHEN** the packaged frontend entry executes on a supported page
- **THEN** it MUST initialize the existing modern Live2D runtime used by `packages/live2d`
- **AND** the widget MUST continue rendering and responding through the maintained Lit/Pixi implementation

### Requirement: Plugin builds SHALL package the frontend dist output automatically
The plugin build pipeline SHALL produce and package the frontend bundle and its emitted assets without requiring a manual copy step into source-managed resources.

#### Scenario: Plugin build includes runtime entry and dependent chunks
- **WHEN** the plugin build runs for packaging
- **THEN** the frontend package build output MUST be generated and synchronized into the plugin's packaged static assets
- **AND** the packaged output MUST include the runtime entry file and any emitted chunks or assets required by that entry

#### Scenario: Packaged asset path remains stable for backend injection
- **WHEN** the frontend build emits hashed chunk filenames
- **THEN** the plugin packaging flow MUST still expose a stable entry path that the backend can inject into Halo pages
- **AND** supporting chunks MUST remain resolvable beneath the same packaged static root

### Requirement: Local development SHALL support loading the modern frontend from a dev server
The Halo integration SHALL provide a development path that loads the same runtime from a frontend dev server so developers can debug the widget in Halo pages without rebuilding the plugin for each change.

#### Scenario: Development bootstrap targets the dev server entry
- **WHEN** Live2D frontend development mode is enabled for local debugging
- **THEN** the backend MUST inject the configured frontend dev-server module entry instead of the packaged production asset entry
- **AND** the loaded module MUST consume the same backend-provided runtime config contract as production

#### Scenario: Production bootstrap remains the default
- **WHEN** development mode is not enabled
- **THEN** the backend MUST load the packaged production frontend entry
- **AND** the dev-server path MUST not be required for normal plugin operation

