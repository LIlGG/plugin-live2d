## 1. Dependency and integration setup

- [x] 1.1 Add the Halo AI foundation SDK from `api-1.0.0-SNAPSHOT.jar` to the Gradle build and remove the obsolete OpenAI SDK dependency.
- [x] 1.2 Introduce a Halo AI-backed chat service path that obtains `AiModelService` via `AiServices` and resolves the configured language model.

## 2. Backend chat migration

- [x] 2.1 Replace the current `ChatClient`-based backend flow with a single Halo AI streaming adapter that converts foundation chunks into existing `ChatResult` SSE events.
- [x] 2.2 Preserve current access-control behavior in `AiChatEndpoint`, including anonymous toggle handling and HTTP 401 responses for unauthenticated requests.
- [x] 2.3 Add backend error handling for missing ai-foundation availability, disabled providers, and unknown model names so failures become readable plugin responses and server logs.

## 3. Settings and runtime config cleanup

- [x] 3.1 Simplify `settings.yaml` to remove OpenAI and proxy settings while adding or retaining only chat-specific controls needed after the Halo migration.
- [x] 3.2 Update `Live2dSettingProcess` so public runtime config still exposes frontend timing fields but does not leak backend-only Halo model configuration.
- [x] 3.3 Remove dead custom AI backend classes, configuration records, and other unused code paths after the Halo AI integration is wired.

## 4. Frontend compatibility verification

- [x] 4.1 Confirm the frontend chat client continues to work against the preserved `/live2d/ai/chat-process` SSE contract without protocol changes.
- [x] 4.2 Update any frontend typing or config handling needed to stay compatible with the simplified backend settings shape.
