## ADDED Requirements

### Requirement: Live2D chat SHALL stream replies through Halo AI foundation
When AI chat is enabled, the Live2D backend SHALL invoke Halo AI foundation for chat generation instead of any plugin-owned provider client, while preserving the existing widget-facing streaming endpoint contract.

#### Scenario: Chat requests are fulfilled by Halo AI foundation
- **WHEN** a user sends a chat message to `/live2d/ai/chat-process`
- **THEN** the backend MUST resolve the configured Halo AI language model through `AiServices.getModelService()`
- **AND** it MUST submit the system prompt plus conversation history to that model
- **AND** it MUST stream assistant text chunks back through the existing SSE response format

#### Scenario: Stream completion preserves the current frontend terminator
- **WHEN** Halo AI foundation reports a successful end of generation
- **THEN** the backend MUST emit the plugin's existing completion marker payload for the frontend consumer
- **AND** it MUST complete the SSE response without requiring frontend protocol changes

### Requirement: Live2D AI chat settings SHALL only keep plugin-specific chat controls
The plugin SHALL configure Live2D chat through Halo-integrated settings that keep widget-specific behavior in this plugin and remove provider-specific connection settings from the plugin schema.

#### Scenario: Plugin settings retain persona and model selection
- **WHEN** an administrator enables AI chat in the Live2D plugin settings
- **THEN** the plugin MUST allow configuration of anonymous-access behavior, persona/system prompt, Halo AI model identifier, and frontend timing controls
- **AND** those settings MUST be used to build chat requests and widget behavior

#### Scenario: Provider-specific settings are removed from the plugin
- **WHEN** an administrator opens the Live2D AI chat settings after this change
- **THEN** OpenAI token, base URL, provider toggle, proxy host, and proxy port settings MUST NOT be present in the plugin configuration form
- **AND** provider credentials and provider enablement MUST be managed through Halo AI infrastructure instead

#### Scenario: Public runtime config excludes backend-only AI foundation settings
- **WHEN** the plugin exposes public runtime configuration to the frontend
- **THEN** it MUST continue exposing AI chat enablement and widget timing fields needed by the browser
- **AND** it MUST NOT expose backend-only Halo model identifiers or provider configuration details to the public config payload

### Requirement: Live2D chat SHALL surface Halo AI dependency failures clearly
The Live2D chat integration SHALL translate Halo AI foundation availability and model-resolution failures into stable plugin behavior for both users and administrators.

#### Scenario: Anonymous-disabled chat still enforces login
- **WHEN** AI chat is enabled but anonymous chat is disabled and an unauthenticated user sends a message
- **THEN** the endpoint MUST reject the request with HTTP 401
- **AND** it MUST NOT invoke Halo AI foundation for that request

#### Scenario: Missing AI foundation dependency or model configuration is reported cleanly
- **WHEN** the ai-foundation plugin is unavailable, disabled, or the configured Halo model cannot be resolved
- **THEN** the backend MUST log the failure for administrators
- **AND** it MUST return a user-facing chat failure message through the existing plugin response flow instead of an unhandled server error
