## Context

Live2D AI chat currently streams UI Message responses through Halo AI Foundation and renders assistant text/reasoning in the widget. It does not declare model-callable tools, execute browser tools, or expose site-owner extensibility for Agent actions.

The plugin already has useful foundations:

- The backend AI chat endpoint enforces AI chat enablement and anonymous-vs-login access with `aiChatBaseSetting.isAnonymous`.
- The frontend uses `@halo-dev/ai-foundation-sdk` `Chat`, which can receive tool calls and send tool outputs or approval responses.
- The Live2D runtime exposes a controller capable of transitions by behavior state, emotion, filter, and duration.
- Public runtime config already separates frontend-safe settings from backend-only settings.
- Halo API provides `SearchService`, `SearchOption`, `SearchResult`, and `HaloDocument` for full-text search over indexed public content.

The new Agent capability layer must let site owners enable controlled site operations without turning the widget into an arbitrary browser automation surface.

## Goals / Non-Goals

**Goals:**

- Add an `Agent 能力` settings tab after AI chat settings.
- Replace the single anonymous-chat boolean with a four-mode access model that distinguishes chat access from Agent access.
- Use AI Foundation UI Message tools for both backend-executed Halo tools and browser-executed tools.
- Let site owners configure declarative browser tools and theme-provided registered executors.
- Provide Halo CMS preset capabilities for search, content resources, latest resources, taxonomies, pages, posts, and comments.
- Enforce safe defaults for navigation, approvals, authentication, schemas, and side effects.

**Non-Goals:**

- Do not provide a Java extension point for other plugins in this change.
- Do not expose arbitrary `fetch`, arbitrary selector clicking, arbitrary form submission, or `eval` as declarative actions.
- Do not expose Live2D model action control as an Agent tool in this change.
- Do not automatically submit comments or contact forms unless a site owner explicitly enables a future supported path with approval.
- Do not make frontend runtime scripts expand the set of model-visible tools by themselves.

## Decisions

### Access model

The existing `isAnonymous` setting will be upgraded to `accessMode`:

- `anonymous_chat`: anonymous and authenticated visitors can chat, Agent tools are unavailable.
- `anonymous_chat_agent`: anonymous and authenticated visitors can chat and use enabled Agent tools.
- `authenticated_chat`: only authenticated visitors can chat, Agent tools are unavailable.
- `authenticated_chat_agent`: only authenticated visitors can chat and use enabled Agent tools.

For backward compatibility:

- `isAnonymous=true` maps to `anonymous_chat`.
- `isAnonymous=false` maps to `authenticated_chat`.

This keeps Agent enablement opt-in during upgrades. A tool-level `requiredAuth` still applies after the global mode gate:

- `none`: available to any visitor whose access mode allows Agent.
- `authenticated`: available only to logged-in visitors whose access mode allows Agent.

Unavailable tools are not declared to the model. The frontend also checks the normalized runtime config before executing any tool call that may remain in history.

### Tool declaration and execution separation

The backend is the source of truth for model-visible tool declarations. It reads saved settings, applies access-mode/auth filters, validates schemas, and passes enabled tools to `UIMessageChatHandlers.streamText`.

Browser tools are declared on the backend without a server executor. The frontend receives the SDK tool call through `onToolCall`, executes the matching normalized browser action, then sends the result with `addToolOutput` or sends approval decisions with `addToolApprovalResponse`/rejection helpers.

The model sees only:

- tool name
- description with safety/approval hints
- input schema

The model does not see execution details such as URLs, selectors, event names, or registered executor internals.

### Declarative browser tools

Site owners can configure `aiTools` in the `Agent 能力` tab. Each tool has a constrained name, description, execution mode, input schema, approval policy, required auth, and action.

Tool names must be lower snake_case, start with a letter, be 3-64 characters, and not duplicate built-in or custom tools.

The supported JSON Schema subset is intentionally small:

- object root
- properties
- required
- primitive field types: string, number, integer, boolean
- enum
- description
- default
- minimum/maximum
- minLength/maxLength

Unsupported schema features such as `$ref`, nested objects, arbitrary arrays, `oneOf`, `anyOf`, `allOf`, and `patternProperties` are rejected or ignored as invalid.

First-version declarative action types:

- `navigate`
- `scroll-to`
- `highlight`
- `dispatch-event`
- `registered`

The first version will not include `set-form-values`; form behavior should be implemented through `dispatch-event` or `registered` executors because Halo themes and form plugins differ too much.

### Frontend registered executors

Themes or site scripts may bind an executor for a declared tool:

```ts
window.Live2DAI.registerTool("show_owner_updates", async ({ input }) => {
  return { ok: true }
})
```

Frontend registration only binds execution for a tool already declared in saved plugin settings or built-in capability config. It cannot add new model-visible tools, descriptions, schemas, or permissions at runtime.

If a registered executor is missing, the frontend returns a structured tool failure such as `TOOL_EXECUTOR_NOT_FOUND` and shows a short user-facing status.

### Approval policy

Tools use a simple approval enum:

- `default`
- `never`
- `always`

Default approval is determined by action type:

- Page context, scroll, highlight, trusted same-origin resource navigation: no approval by default.
- External navigation, registered executors, dispatch events with side effects, and comment submission paths: approval by default.

Approval UI belongs to the Live2D chat/widget experience, not `window.confirm`. Tool execution results are sent back to the SDK; raw JSON output is not shown directly to visitors.

### Navigation model

Generic `navigate_to_url` is not exposed to the model by default. Navigation is performed through specific tools or trusted resources.

For declared `navigate` actions:

- relative URLs and same-origin URLs are allowed.
- external origins require an allowlist and approval.
- `javascript:`, `mailto:`, and `tel:` are disallowed by default.
- `_blank` requires explicit site-owner permission.

For Halo resources returned from server tools, the frontend keeps a short-lived in-memory trusted resource cache. `open_halo_resource` can only navigate to a resource present in the current runtime cache. The cache is not restored from persisted chat history.

On non-SPA/PJAX themes, navigation may reload the page and interrupt the current tool chain. Navigation tools should send a success tool output and a short Live2D status before calling `location.assign`. SPA/PJAX support can be added later through registered tools or a navigation mode hook.

### Halo preset tools

Backend-executed preset tools should use Halo backend APIs wherever possible. Browser-only actions are reserved for operations that require the visitor page.

Search uses Halo `SearchService` as the primary source:

- `search_halo_resources`
- defaults to public, published, non-recycled content
- limits result size
- filters `includeTypes` through a site-owner allowlist
- returns resource metadata, permalink, description, and a short excerpt, not full content

Detail lookup uses a separate tool:

- `get_halo_resource_detail`
- only for trusted/current public resources
- returns bounded content with `truncated` metadata
- max content length is configurable with a hard upper bound

Latest resources use structured resource queries rather than full-text search, because latest lists are not keyword searches:

- `get_latest_halo_resources`
- first version must support posts
- pages and other types can be enabled where reliable adapters exist

Taxonomies and pages use structured Halo content queries:

- `get_categories`
- `get_tags`
- `get_posts_by_category`
- `get_posts_by_tag`
- `get_pages`
- `search_pages` where useful

Comments are a Halo preset capability with three levels:

- `off`: no comment tools
- `assist`: open comment area, read public comments where available, draft comment content
- `submit`: includes assist and may submit comments only when site policy, authentication, approval, and Halo comment requirements allow it

The default comment capability is `assist`.

### Configuration UI

The `Agent 能力` tab is shown after AI chat settings. It remains visible even when AI chat or Agent access is disabled, but shows a clear notice when the saved configuration will not currently affect visitors.

The first version may use JSON textarea configuration for custom tools with validation and examples. A visual FormKit builder can be added later. The tab should include grouped built-in capability toggles and advanced per-tool overrides.

## Risks / Trade-offs

- [Risk] Tool declarations and frontend execution config diverge. → Normalize the same saved settings on backend and frontend, and reject unknown tool calls at execution time.
- [Risk] Browser navigation reloads the page before model continuation completes. → Send tool output and short status before navigation, and treat full-page navigation as a terminal side effect.
- [Risk] Site-owner custom JSON is difficult to configure. → Start with JSON plus examples and validation; add a visual builder later.
- [Risk] Search results may include types that do not have stable detail adapters. → Use SearchService for result discovery, but limit detail lookup to supported public resource types.
- [Risk] Registered executors can do arbitrary site-specific work. → Do not let them declare new tools, default them to authenticated where appropriate, and require approval by default.
- [Risk] Comment submission interacts with auth, captcha, review, and anti-spam flows. → Default comments to assist mode and only submit through explicit enabled paths with approval and Halo validation.

## Migration Plan

1. Add `accessMode` while reading existing `isAnonymous` as a fallback.
2. Keep upgraded sites in chat-only modes by default.
3. Add Agent settings without enabling page operations unless the site owner opts in.
4. Keep old AI chat behavior when no Agent tools are enabled.
5. If rollback is needed, ignore `accessMode` and Agent settings; existing chat settings remain sufficient for text chat.

## Open Questions

- Which Halo content APIs should be used for latest posts, pages, category/tag permalinks, and comments in the first implementation pass?
- Should the first version include a dedicated frontend approval overlay, or reuse an existing chat panel/message interaction component?
- How much of the Agent settings validation can be enforced directly in FormKit versus runtime normalization?
