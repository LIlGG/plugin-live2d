# agent-capability-runtime Specification

## Purpose
Define how Live2D Agent access, browser tool execution, custom tools, approvals, and constrained navigation work.

## Requirements

### Requirement: Agent access modes SHALL control chat and tool availability
The plugin SHALL use a four-mode AI access model to control whether anonymous and authenticated visitors can chat and whether Agent tools are available.

#### Scenario: Anonymous chat without Agent
- **WHEN** the access mode is `anonymous_chat`
- **THEN** anonymous visitors MUST be allowed to send chat messages
- **AND** authenticated visitors MUST be allowed to send chat messages
- **AND** no Agent tools MUST be declared to the model

#### Scenario: Anonymous chat with Agent
- **WHEN** the access mode is `anonymous_chat_agent`
- **THEN** anonymous visitors MUST be allowed to chat and use Agent tools that do not require authentication
- **AND** authenticated visitors MUST be allowed to chat and use all enabled Agent tools they are authorized to use

#### Scenario: Authenticated chat without Agent
- **WHEN** the access mode is `authenticated_chat`
- **THEN** anonymous visitors MUST be rejected before invoking the model
- **AND** authenticated visitors MUST be allowed to chat
- **AND** no Agent tools MUST be declared to the model

#### Scenario: Authenticated chat with Agent
- **WHEN** the access mode is `authenticated_chat_agent`
- **THEN** anonymous visitors MUST be rejected before invoking the model
- **AND** authenticated visitors MUST be allowed to chat and use enabled Agent tools

### Requirement: Tool declarations SHALL be generated from saved settings and runtime permissions
The backend SHALL be the source of truth for model-visible Agent tool declarations.

#### Scenario: Backend declares only currently available tools
- **WHEN** a chat request is accepted
- **THEN** the backend MUST normalize enabled built-in and custom Agent tools from saved settings
- **AND** it MUST filter tools by access mode, authentication state, enabled status, required auth, and schema validity
- **AND** it MUST pass only the remaining tool definitions to Halo AI Foundation

#### Scenario: Unavailable tools are hidden from the model
- **WHEN** a tool is disabled, invalid, requires authentication for an anonymous visitor, or Agent access is not enabled
- **THEN** the backend MUST NOT include that tool in the request tool definitions

#### Scenario: Execution details are not model-visible
- **WHEN** the backend builds a tool definition
- **THEN** the tool definition MUST include the tool name, description, and input schema
- **AND** it MUST NOT expose browser action URLs, selectors, event names, registered executor internals, or other execution-only metadata to the model

### Requirement: Browser tools SHALL execute through the SDK UI tool flow
Browser-executed Agent tools SHALL be handled by the frontend using the AI Foundation SDK UI tool-call workflow.

#### Scenario: Frontend executes browser tool call
- **WHEN** the SDK `Chat` receives a browser tool call through `onToolCall`
- **THEN** the frontend MUST resolve the tool against normalized public Agent runtime config
- **AND** it MUST execute the configured browser action only if the tool is allowed
- **AND** it MUST send a structured tool result with `addToolOutput`

#### Scenario: Frontend rejects unknown or forbidden tool call
- **WHEN** a browser tool call is not present in the normalized runtime config or is forbidden for the current visitor
- **THEN** the frontend MUST NOT execute the action
- **AND** it MUST return a structured failure result to the SDK tool flow

#### Scenario: Missing registered executor reports failure
- **WHEN** a declared `registered` browser tool is called but no matching frontend executor is registered
- **THEN** the frontend MUST return a structured `TOOL_EXECUTOR_NOT_FOUND` failure
- **AND** it MUST show a short visitor-facing status instead of failing silently

### Requirement: Site owners SHALL configure declarative browser tools safely
The plugin SHALL support site-owner custom Agent tools with constrained names, schemas, approvals, auth requirements, and browser actions.

#### Scenario: Custom tool names are constrained
- **WHEN** a site owner configures a custom Agent tool
- **THEN** the tool name MUST be lower snake_case, start with a letter, be 3 to 64 characters long, and not duplicate a built-in or custom tool name

#### Scenario: Custom tool schemas use a constrained subset
- **WHEN** a custom Agent tool defines an input schema
- **THEN** the plugin MUST accept only the supported JSON Schema subset for object inputs and primitive properties
- **AND** it MUST treat unsupported schema constructs as invalid for Agent declaration

#### Scenario: Custom tool action types are limited
- **WHEN** a custom Agent tool is normalized
- **THEN** only `navigate`, `scroll-to`, `highlight`, `dispatch-event`, and `registered` actions MUST be accepted
- **AND** arbitrary fetch, arbitrary JavaScript execution, arbitrary selector clicking, and arbitrary form submission MUST NOT be accepted as declarative actions

### Requirement: Approval policy SHALL guard side-effectful Agent tools
The plugin SHALL apply approval rules before executing Agent tools that can create side effects or surprise the visitor.

#### Scenario: Tool requests visitor approval
- **WHEN** a tool policy resolves to approval required
- **THEN** the frontend MUST present an approval UI in the Live2D chat/widget experience
- **AND** it MUST continue, reject, or report the tool call through the SDK approval workflow based on the visitor response

#### Scenario: Default approval follows action risk
- **WHEN** a tool uses the default approval policy
- **THEN** low-risk page context, trusted same-origin navigation, scroll, and highlight actions MUST execute without approval
- **AND** external navigation, registered executors, comment submission, and configured side-effectful actions MUST require approval

### Requirement: Navigation SHALL be constrained to declared actions or trusted resources
The plugin SHALL avoid exposing unrestricted URL navigation to the model.

#### Scenario: Declared navigation validates destination
- **WHEN** a `navigate` action is executed
- **THEN** relative URLs and same-origin URLs MUST be allowed
- **AND** external origins MUST require both allowlist membership and approval
- **AND** unsafe protocols MUST be rejected by default

#### Scenario: Trusted resource navigation uses a short-lived cache
- **WHEN** a backend tool returns Halo resources with permalinks
- **THEN** the frontend MUST store those resources in a current-page in-memory trusted resource cache
- **AND** resource navigation MUST only open resources that are present in that cache
- **AND** the cache MUST NOT be restored from persisted chat history after page reload

#### Scenario: Full-page navigation may terminate continuation
- **WHEN** a navigation action will reload the page
- **THEN** the frontend MUST send a success tool result and short Live2D status before navigating
- **AND** it MUST NOT require the same model turn to continue after the page unloads
