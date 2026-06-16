## MODIFIED Requirements

### Requirement: Live2D chat SHALL stream replies through Halo AI foundation
When AI chat is enabled, the Live2D backend SHALL invoke Halo AI foundation for chat generation, UI Message streaming, and enabled Agent tool declarations instead of any plugin-owned provider client, while preserving the widget-facing streaming endpoint contract.

#### Scenario: Chat requests are fulfilled by Halo AI foundation
- **WHEN** a user sends a chat message to `/live2d/ai/chat-process`
- **THEN** the backend MUST resolve the configured Halo AI language model through Halo AI foundation
- **AND** it MUST submit the system prompt plus conversation history to that model
- **AND** it MUST stream assistant UI Message chunks back through the plugin SSE response flow

#### Scenario: Stream completion preserves the current frontend terminator
- **WHEN** Halo AI foundation reports a successful end of generation
- **THEN** the backend MUST emit the Halo UI Message stream done marker for the frontend consumer
- **AND** it MUST complete the SSE response without requiring non-SDK frontend parsing

#### Scenario: Agent-enabled chat declares available tools
- **WHEN** AI chat is enabled and the current access mode allows Agent capabilities for the visitor
- **THEN** the backend MUST pass the currently available Agent tool definitions to Halo AI foundation
- **AND** browser-executed tools MUST be declared without server executors
- **AND** server-executed Halo preset tools MUST include executors

### Requirement: Live2D AI chat settings SHALL only keep plugin-specific chat controls
The plugin SHALL configure Live2D chat through Halo-integrated settings that keep widget-specific behavior in this plugin and remove provider-specific connection settings from the plugin schema.

#### Scenario: Plugin settings retain persona, access mode, and model selection
- **WHEN** an administrator enables AI chat in the Live2D plugin settings
- **THEN** the plugin MUST allow configuration of AI access mode, persona/system prompt, Halo AI model identifier, and frontend timing controls
- **AND** those settings MUST be used to build chat requests and widget behavior

#### Scenario: Legacy anonymous setting maps to chat-only access mode
- **WHEN** existing settings contain `isAnonymous=true` and no access mode
- **THEN** the plugin MUST treat the setting as `anonymous_chat`
- **AND** it MUST NOT enable Agent capabilities implicitly

#### Scenario: Legacy authenticated setting maps to chat-only access mode
- **WHEN** existing settings contain `isAnonymous=false` and no access mode
- **THEN** the plugin MUST treat the setting as `authenticated_chat`
- **AND** it MUST NOT enable Agent capabilities implicitly

#### Scenario: Provider-specific settings are removed from the plugin
- **WHEN** an administrator opens the Live2D AI chat settings after this change
- **THEN** OpenAI token, base URL, provider toggle, proxy host, and proxy port settings MUST NOT be present in the plugin configuration form
- **AND** provider credentials and provider enablement MUST be managed through Halo AI infrastructure instead

#### Scenario: Public runtime config excludes backend-only AI foundation settings
- **WHEN** the plugin exposes public runtime configuration to the frontend
- **THEN** it MUST continue exposing AI chat enablement and widget timing fields needed by the browser
- **AND** it MUST NOT expose backend-only Halo model identifiers or provider configuration details to the public config payload

### Requirement: Live2D chat SHALL surface Halo AI dependency failures clearly
The Live2D chat integration SHALL translate Halo AI foundation availability, model-resolution failures, and Agent access failures into stable plugin behavior for both users and administrators.

#### Scenario: Authenticated-only chat still enforces login
- **WHEN** AI chat is enabled but the access mode requires authentication and an unauthenticated user sends a message
- **THEN** the endpoint MUST reject the request with HTTP 401
- **AND** it MUST NOT invoke Halo AI foundation for that request

#### Scenario: Agent-disabled chat does not declare tools
- **WHEN** AI chat is enabled but the access mode does not allow Agent capabilities for the visitor
- **THEN** the backend MUST still allow chat according to the access mode
- **AND** it MUST NOT declare any Agent tools to Halo AI foundation
- **AND** the system prompt MUST avoid promising direct site operations

#### Scenario: Missing AI foundation dependency or model configuration is reported cleanly
- **WHEN** the ai-foundation plugin is unavailable, disabled, or the configured Halo model cannot be resolved
- **THEN** the backend MUST log the failure for administrators
- **AND** it MUST return a user-facing chat failure message through the existing plugin response flow instead of an unhandled server error
