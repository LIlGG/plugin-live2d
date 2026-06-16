## 1. Settings and Configuration Model

- [x] 1.1 Add Agent access mode types and map legacy `isAnonymous` values to chat-only access modes.
- [x] 1.2 Add Agent capability settings records for built-in capabilities, custom tools, security policy, approval policy, comment level, and search type allowlist.
- [x] 1.3 Add backend normalization for custom Agent tool names, enabled status, required auth, approval policy, action type, and supported JSON Schema subset.
- [x] 1.4 Add frontend normalization types for the public Agent runtime config.
- [x] 1.5 Update public setting processing so only frontend-safe Agent browser execution metadata is exposed.
- [x] 1.6 Add the `Agent 能力` settings tab after AI chat settings with access-mode guidance and JSON custom-tool configuration.

## 2. Backend Tool Declaration Runtime

- [x] 2.1 Add an Agent tool registry/service that builds tool definitions from normalized built-in and custom settings.
- [x] 2.2 Filter tool definitions by access mode, authentication state, enabled status, required auth, and schema validity.
- [x] 2.3 Update AI chat request handling to resolve access mode and pass available tools into `UIMessageChatHandlers.streamText`.
- [x] 2.4 Add system prompt capability/boundary text for Agent-enabled and Agent-disabled modes.
- [x] 2.5 Ensure browser-executed tools are declared without executors and server-executed Halo preset tools include executors.
- [x] 2.6 Add tests for access-mode migration, anonymous/authenticated filtering, disabled Agent mode, and invalid custom tool rejection.

## 3. Halo Preset Server Tools

- [x] 3.1 Implement `search_halo_resources` using Halo `SearchService` with public/published/non-recycled defaults and type allowlist filtering.
- [x] 3.2 Implement bounded search result mapping with resource IDs, types, titles, descriptions/excerpts, metadata names, and permalinks.
- [x] 3.3 Implement `get_halo_resource_detail` for supported public resources with configurable content length and truncation metadata.
- [x] 3.4 Implement `get_latest_halo_resources` with stable public post support.
- [x] 3.5 Implement category and tag tools for listing taxonomies and listing public posts by taxonomy.
- [x] 3.6 Implement page tools for listing/searching public single pages and returning trusted resource metadata.
- [x] 3.7 Implement comment capability levels `off`, `assist`, and `submit` with safe defaults and structured failure for unmet auth/captcha/site-flow requirements.
- [x] 3.8 Add backend tests for Halo preset tool outputs, filtering, and failure cases.

## 4. Frontend Agent Tool Runtime

- [x] 4.1 Wire SDK `Chat` `onToolCall`, tool output, approval response, and rejection handling in the Live2D chat API.
- [x] 4.2 Add a browser tool executor registry for built-in actions, declarative tools, and site-registered executors.
- [x] 4.3 Expose `window.Live2DAI.registerTool(name, executor)` without allowing runtime scripts to declare new model-visible tools.
- [x] 4.4 Implement short-lived trusted resource cache and `open_halo_resource` navigation.
- [x] 4.5 Implement safe declarative actions: `navigate`, `scroll-to`, `highlight`, `dispatch-event`, and `registered`.
- [x] 4.6 Add navigation behavior that sends tool output and visitor status before full-page navigation.
- [x] 4.7 Add structured failure results and visitor-facing status messages for unknown, forbidden, invalid, and missing-executor tools.
- [x] 4.8 Add frontend tests for tool execution, trusted navigation, registered executor binding, and failure handling.

## 5. Live2D Action Execution

- [x] 5.1 Remove Live2D action execution from Agent capabilities.
- [x] 5.2 Keep the Live2D runtime controller available for native widget behavior only.
- [x] 5.3 Remove site-owner action alias configuration from Agent settings.
- [x] 5.4 Reject custom declarative Agent actions that try to use `perform-live2d-action`.
- [x] 5.5 Remove Agent runtime tests that expected model-controlled Live2D transitions.

## 6. Approval and User Experience

- [x] 6.1 Add approval policy resolution for default, never, and always modes.
- [x] 6.2 Add Live2D-side approval UI for tool calls that require visitor confirmation.
- [x] 6.3 Add default short status messages for tool pending, success, and error states.
- [x] 6.4 Ensure raw tool output JSON is returned to the model but not directly rendered as visitor chat text.
- [x] 6.5 Add tests for approval accept, approval reject, and side-effectful default approval behavior.

## 7. Validation and Documentation

- [x] 7.1 Update README or admin documentation for access modes, Agent capability groups, custom tools, registered executors, and safety boundaries.
- [x] 7.2 Add examples for common Halo preset navigation/search and custom dispatch-event/registered tools.
- [x] 7.3 Run backend tests and frontend build/type checks.
- [ ] 7.4 Manually verify anonymous chat-only, anonymous chat-agent, authenticated chat-only, and authenticated chat-agent behavior.
- [ ] 7.5 Manually verify a full-page navigation theme flow and a no-reload registered navigation flow.
