## Why

Live2D AI chat can now use Halo AI Foundation UI Message tool calls, but the plugin only streams assistant text today. Site owners need a controlled way to let the Live2D agent operate approved site capabilities and use Halo CMS content/search primitives without hard-coding every site-specific behavior into this plugin.

## What Changes

- Add an Agent capabilities configuration area after AI chat settings, with access modes that separately control chat and Agent availability for anonymous and authenticated visitors.
- Allow the backend to declare AI Foundation tools from enabled built-in capabilities and site-owner configuration.
- Add browser-executed tools through the SDK UI tool-call flow, including trusted resource navigation, page context, declaration-based actions, and registered frontend executors.
- Add server-executed Halo CMS preset tools for public resource search, resource detail lookup, latest resources, categories, tags, pages, posts, and comments where Halo backend APIs can provide the data.
- Support site-owner declarative tools with constrained JSON Schema inputs, approval policy, auth requirements, and safe browser action types.
- Add frontend registration for site/theme executors without allowing runtime scripts to expand the model-visible tool declarations.
- Add approval and safety behavior for side-effectful tools, external navigation, comments, and registered actions.

## Capabilities

### New Capabilities
- `agent-capability-runtime`: Declares, filters, approves, and executes Agent tools across backend and browser runtimes.
- `halo-agent-presets`: Provides Halo CMS preset search, navigation resources, latest content, taxonomy, pages, and comment assistance tools.

### Modified Capabilities
- `halo-ai-chat-integration`: Upgrade AI chat access settings and streaming behavior to include UI Message tool declarations, tool-call continuation, and Agent availability boundaries.
- `live2d-public-runtime-config`: Expose frontend-safe Agent runtime configuration needed to execute browser tools while keeping model declarations and backend-only settings controlled by the server.

## Impact

- Backend chat endpoint and service will need to resolve access mode, authentication state, enabled Agent tools, Halo search/resource tools, and UI Message tool definitions.
- Frontend chat API will need to wire SDK `onToolCall`, tool output, approval response, trusted resource cache, and browser action execution.
- Settings schema will gain an `Agent 能力` tab and migrate the current anonymous-chat boolean into a four-mode access model with backward compatibility.
- Public runtime config will include only safe browser execution metadata, not model identifiers, provider credentials, or arbitrary executable code.
- Halo SearchService and content/comment extension APIs may be used for server-side preset tools.
