## Context

Live2D chat currently sends the frontend's message history to `/live2d/ai/chat-process`, where the plugin prepends a system prompt and then delegates generation to plugin-owned `ChatClient` implementations. The only concrete client today is an OpenAI-specific streaming client backed by plugin settings for proxy, token, base URL, and model selection.

The target state is to keep the Live2D chat UX and endpoint shape stable while delegating model discovery and invocation to Halo AI 基础设施. The upstream SDK is not yet available from a published repository, so this change must integrate through the provided `api-1.0.0-SNAPSHOT.jar` and the documented `AiServices` / `AiModelService` APIs.

## Goals / Non-Goals

**Goals:**
- Route Live2D chat generation through Halo AI foundation instead of the plugin's custom OpenAI client stack.
- Preserve the existing frontend chat contract so the widget keeps working with minimal behavioral change.
- Reduce plugin-owned AI configuration to chat-specific controls only: enablement, anonymous access, role prompt, model selection, and frontend timing values.
- Remove obsolete backend classes, settings, and dependencies once Halo AI integration is in place.

**Non-Goals:**
- Redesign the Live2D chat UI or change the existing streaming presentation model.
- Add provider management, credential storage, or model provisioning inside the Live2D plugin.
- Generalize this change into a reusable abstraction for non-chat AI features.

## Decisions

### Use Halo AI foundation as the only chat backend
The backend will replace `ChatClient`-based provider dispatch with a single service path built on `AiServices.getModelService()`. The endpoint will obtain the configured Halo model name, resolve a `LanguageModel`, build a foundation `ChatRequest`, and stream foundation `ChatChunk` events back into the existing SSE response format consumed by the frontend.

**Why this approach**
- It removes duplicated provider integration code from the plugin.
- It aligns provider credentials and model lifecycle with Halo's centralized AI management.
- It minimizes frontend churn because the SSE endpoint can still emit the current `ChatResult` payload shape.

**Alternatives considered**
- Keep the `ChatClient` abstraction and add a Halo-backed implementation: rejected because the abstraction exists only to multiplex plugin-owned providers and would preserve unnecessary complexity.
- Proxy raw Halo AI responses directly to the frontend: rejected because the frontend already depends on `ChatResult` chunks and changing that contract would widen the migration surface.

### Keep a plugin-level model selector, but not provider credentials
The plugin will retain a single AI-model identifier field that stores the Halo AI model resource name (for example `openai/gpt-4o`) alongside the existing persona prompt and access-control settings. Provider token, base URL, proxy, and provider enablement will move fully out of this plugin.

**Why this approach**
- Halo AI foundation still requires the caller to request a concrete model.
- Selecting a model per plugin preserves expected plugin autonomy without reintroducing provider-specific configuration.
- It avoids brittle "first configured model wins" behavior.

**Alternatives considered**
- Always use the first available Halo model: rejected because availability order is undefined and can change across environments.
- Add no plugin-level model choice and wait for a Halo-wide default model API: rejected because the current SDK and documentation do not define that capability.

### Depend on the local SDK jar until the upstream artifact is published
The Gradle build will reference the provided `api-1.0.0-SNAPSHOT.jar` as a compile-time dependency and remove the old OpenAI SDK dependency that is no longer needed.

**Why this approach**
- It matches the currently available distribution mechanism.
- It keeps the migration unblockable without inventing a separate publishing pipeline.

**Alternatives considered**
- Depend on a Maven coordinate that is not yet published: rejected because builds would not be reproducible in the current repository state.
- Vendor copied source or decompiled classes: rejected because it would increase maintenance cost and drift from the upstream SDK.

### Preserve backend-to-frontend error semantics at the plugin boundary
The endpoint will translate Halo AI foundation failures into readable plugin responses consistent with the current chat UX: unauthorized access remains an HTTP 401, while model/plugin/provider failures stream a user-facing error message through the existing SSE contract and terminate cleanly.

**Why this approach**
- The current frontend already handles 401 and streamed error text.
- It avoids exposing raw provider internals in the browser while still giving administrators actionable logs on the server side.

## Risks / Trade-offs

- **[SDK distribution friction]** Local jar dependency is less ergonomic than a published artifact → Document the dependency strategy in the change and isolate it so it can be swapped to a Maven coordinate later.
- **[Model selection discoverability]** A free-form model name field is easier to misconfigure than a populated dropdown → Validate the field on use, surface a clear error when the model cannot be resolved, and consider a follow-up enhancement for dynamic options if Halo exposes them.
- **[Streaming contract translation]** Halo AI chunk types may not map 1:1 to the plugin's current `[DONE]`-terminated SSE stream → Normalize chunk types in one backend adapter layer and keep the frontend contract unchanged.
- **[Plugin dependency coupling]** Live2D chat will now require the ai-foundation plugin at runtime when AI chat is enabled → Fail fast with a clear administrative message when the dependency is missing or disabled.

## Migration Plan

1. Add the Halo AI SDK dependency from the provided jar and remove the obsolete OpenAI SDK usage.
2. Replace the custom backend generation path with a Halo AI-backed service that adapts foundation chunks into existing `ChatResult` SSE events.
3. Simplify `settings.yaml` and runtime config shaping to remove provider/proxy fields while keeping chat-specific controls.
4. Verify the frontend works unchanged against the preserved endpoint contract, then remove dead backend classes and configuration paths.

## Open Questions

- Whether Halo will soon expose a canonical default chat model API; if it does, the plugin-level model name field could be simplified in a follow-up change.
