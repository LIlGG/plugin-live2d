# live2d-public-runtime-config Specification

## Purpose
TBD - created by archiving change integrate-modern-live2d-frontend. Update Purpose after archive.
## Requirements
### Requirement: Backend SHALL publish a frontend-safe Live2D runtime config payload
The plugin backend SHALL publish a dedicated public config payload for the Live2D frontend instead of exposing a broad merged settings object directly to inline initialization code.

#### Scenario: Public payload contains only frontend-safe runtime fields
- **WHEN** the backend prepares Live2D configuration for page rendering
- **THEN** it MUST map settings into a dedicated public payload that includes only fields required by the frontend runtime
- **AND** backend-only or sensitive settings MUST be excluded from that payload by construction

#### Scenario: Public payload remains compatible with the modern runtime
- **WHEN** the frontend bootstrap reads the public config payload
- **THEN** it MUST receive the fields needed to preserve current widget behavior, including runtime toggles, tips sources, model defaults, AI-chat runtime timings, and declarative custom tool definitions when configured
- **AND** it MUST not require the backend to expose raw settings groups that are not part of the frontend contract

### Requirement: Halo bootstrap SHALL deliver config separately from execution logic
The plugin SHALL provide the runtime config payload in a transport that is separate from the frontend execution bundle so configuration and code loading can evolve independently.

#### Scenario: Config is embedded without rebuilding executable inline logic
- **WHEN** a Halo page is rendered with the Live2D plugin enabled
- **THEN** the backend MUST emit the public config payload in a machine-readable form that the frontend bundle can read at startup
- **AND** the backend MUST not need to serialize a broad JavaScript object directly into inline runtime initialization code

#### Scenario: Development and production share the same config contract
- **WHEN** the frontend is loaded from packaged assets or from a dev server
- **THEN** both startup modes MUST read the same public config payload shape
- **AND** environment-specific bootstrap differences MUST not require a second config format

