# live2d-custom-tool-actions Specification

## Purpose
TBD - created by archiving change integrate-modern-live2d-frontend. Update Purpose after archive.
## Requirements
### Requirement: Plugin users SHALL be able to declare custom tools through backend configuration
The plugin SHALL allow Halo administrators to configure additional Live2D tools through backend settings so they can extend the toolbar without editing frontend source code.

#### Scenario: Backend publishes custom tool definitions
- **WHEN** a site administrator configures custom Live2D tools in plugin settings
- **THEN** the backend MUST expose those tools through the public runtime config payload
- **AND** each tool definition MUST include declarative metadata needed to render and order the tool in the frontend

#### Scenario: Custom tools coexist with preset tools
- **WHEN** the frontend renders the Live2D toolbar with both preset and custom tools configured
- **THEN** it MUST mount the custom tools alongside preset tools
- **AND** custom tools MUST participate in the same ordering and visibility flow as supported preset tools

### Requirement: Custom tools SHALL bind only to supported declarative actions
The frontend SHALL execute backend-configured custom tools through a supported action registry instead of evaluating arbitrary JavaScript delivered through configuration.

#### Scenario: Supported action types trigger frontend-exposed capabilities
- **WHEN** a user activates a configured custom tool
- **THEN** the frontend MUST resolve the tool's configured action against a supported action registry
- **AND** it MUST execute the matching runtime capability with declarative payload data only

#### Scenario: Arbitrary code execution is not supported
- **WHEN** a custom tool definition includes script content or an unsupported executable payload
- **THEN** the plugin MUST reject or ignore that executable content instead of evaluating it in the browser
- **AND** custom tool execution MUST remain limited to supported declarative actions

### Requirement: The supported action registry SHALL cover core extension use cases
The frontend SHALL expose a documented set of reusable actions so plugin users can extend the toolbar for common Live2D interactions without requiring bespoke frontend patches.

#### Scenario: Core action set is available for configuration
- **WHEN** the plugin documents or validates supported custom tool actions
- **THEN** it MUST include actions for at least sending a widget message, toggling widget visibility, toggling the chat panel, switching model or texture, capturing a screenshot, opening a configured URL, and emitting a namespaced custom event
- **AND** each action MUST define the declarative payload fields it accepts

#### Scenario: Advanced model control can be added without a new scripting escape hatch
- **WHEN** the runtime exposes additional safe actions such as loading a specific model selection
- **THEN** those actions MUST be added through the same registry contract
- **AND** extending the registry MUST not require reintroducing raw executable tool definitions

