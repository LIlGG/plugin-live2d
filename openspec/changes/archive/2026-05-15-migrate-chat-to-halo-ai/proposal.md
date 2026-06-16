## Why

Live2D chat currently depends on plugin-owned AI settings, custom OpenAI client logic, and proxy/token management that duplicate capabilities Halo is beginning to provide centrally. Migrating to Halo AI 基础设施 will reduce duplicated backend code, align chat behavior with Halo-wide model management, and let administrators configure AI once instead of per plugin.

## What Changes

- Replace the Live2D chat backend integration with Halo AI 基础设施 instead of the plugin's custom OpenAI client pipeline.
- Use the AI foundation SDK from the provided `api-1.0.0-SNAPSHOT.jar` until the upstream repository artifact is publicly available.
- Keep the existing Live2D chat entry point and streaming user experience, but source model access and streaming responses from Halo AI services.
- Simplify plugin settings so AI chat keeps only widget-specific behavior controls and persona prompt configuration.
- **BREAKING** Remove plugin-specific provider settings such as OpenAI token/base URL/model and proxy configuration from the Live2D plugin.
- Remove unused custom backend AI classes and dependency wiring after Halo AI integration is in place.

## Capabilities

### New Capabilities
- `halo-ai-chat-integration`: Live2D chat streams replies through Halo AI foundation services while preserving the widget-facing chat API and persona behavior.

### Modified Capabilities
- None.

## Impact

- Backend chat flow under `src/main/java/run/halo/live2d/chat/**`
- Plugin settings schema in `src/main/resources/extensions/settings.yaml`
- Runtime config shaping in `src/main/java/run/halo/live2d/Live2dSettingProcess.java`
- Frontend chat client and widget integration in `packages/live2d/src/**`
- Build dependency management in `build.gradle`
