## Context

`packages/live2d` is now the maintained frontend runtime, but Halo pages are still initialized through `Live2dInitProcessor` and the legacy `static/js/live2d-autoload.min.js` bundle. The repository therefore carries two frontend integration models at once: the Lit/Pixi runtime that development is happening in, and the older static asset bootstrap that production still uses.

This change crosses backend bootstrapping, frontend packaging, runtime config handling, and local debugging workflow. It also has a migration concern: once Halo switches to the modern bundle path, the legacy CSS, bootstrap script, and supporting static libraries should be removable without regressing the widget's existing behavior.

## Goals / Non-Goals

**Goals:**
- Make the Halo plugin load the modern frontend bundle as the only production widget bootstrap path.
- Ensure plugin builds package the frontend output automatically so JAR artifacts ship the correct runtime entry and supporting chunks.
- Replace the current broad injected config object with an explicit public config payload that only includes frontend-safe settings.
- Let plugin users extend the toolbar through backend-configured custom tools that target a supported frontend action registry.
- Preserve the current backend model API usage and existing user-visible widget flows while modernizing bootstrapping and packaging.
- Provide a repeatable local development flow where Halo can target a Vite dev server without forking runtime logic.

**Non-Goals:**
- Introduce new backend model metadata endpoints or change the existing model/texture API contracts.
- Rework widget behavior that has already been covered by the modern parity changes unless required by the new bootstrap path.
- Add runtime-configurable hot reload behavior for end users in production.
- Preserve the old `live2d-autoload` source tree once the modern integration path is proven and active.

## Decisions

### Use a dedicated Halo bootstrap entry instead of inline `live2d.init(...)`
The plugin should stop emitting a script tag for `live2d-autoload.min.js` plus inline initialization code. Instead, the backend should emit:

1. a frontend-safe JSON payload embedded in the page, and
2. a module entry that reads that payload and starts the runtime.

This keeps execution logic in the frontend bundle, avoids string-building a JavaScript object in the backend, and gives development and production the same startup contract. The alternative was to keep the inline `live2d.init(path, config)` pattern and simply point it at the new bundle, but that would preserve the legacy bootstrap shape and continue coupling backend rendering to frontend API details.

### Publish a dedicated public runtime config object
The backend should map plugin settings into an explicit public DTO instead of merging all settings groups and deleting a few unsafe fields afterward. The DTO should include only fields required by the runtime, such as model selection defaults, runtime toggles, tips sources, AI-chat timing or endpoint fields that are intentionally public, and declarative custom tool definitions.

This gives the frontend a stable contract and reduces the risk of accidentally exposing backend-only settings. The alternative was to continue with the current "merge everything, then trim" approach, but that makes future settings additions risky and hard to review.

### Replace executable custom tools with a declarative action registry
The current frontend `customTools` support accepts executable callbacks or stringified code, which is useful for local experimentation but is not an acceptable backend configuration contract. Backend-configured custom tools should instead be modeled as declarative tool definitions that target a supported frontend action registry.

That registry should cover the core extension cases already visible in the runtime today:

- send a Live2D message
- show, hide, or toggle the widget
- toggle the AI chat window
- switch model or switch texture
- capture a screenshot
- open a configured URL
- emit a namespaced custom DOM event
- optionally load a specific model/texture selection through an explicit safe action

This keeps the extension surface powerful while avoiding remote code execution through plugin settings. The alternative was to preserve the current `new Function(...)` path and merely pass its source from the backend, but that would turn plugin configuration into arbitrary browser-side code execution and make validation impossible.

### Package frontend assets through the Gradle resource pipeline
Frontend build output should be generated from `packages/live2d` and synchronized into the plugin's packaged resources as part of the build lifecycle, preferably through a dedicated frontend build/sync task that `processResources` depends on. The plugin should package the emitted entry file and all hashed chunks under a namespaced static directory.

This keeps JAR packaging deterministic and avoids manual copy steps into source-controlled resource folders. The alternative was to copy dist output back into `src/main/resources/static`, but that would mix generated artifacts with maintained source assets and make cleanup harder.

### Support a dual-source bootstrap for production and local debugging
The backend bootstrap should support two sources for the frontend entry:

- packaged plugin assets in production
- a configured Vite dev-server entry in local development

Both sources should consume the same embedded public config payload so the runtime logic remains identical across environments. The alternative was to rely on the standalone demo page for local testing, but that does not validate the real Halo integration path or backend-provided config behavior.

### Remove legacy assets only after the modern bootstrap owns all entry points
Legacy static JS/CSS/lib assets should be deleted once no backend processor or documented flow references them anymore. That removal is part of this change, but it should happen after the new bootstrap and packaging path are fully wired so the repository does not temporarily lose a working production entry.

The alternative was to delete the old files immediately and patch the rest afterward, but that would make the migration harder to verify and easier to break midway through implementation.

## Risks / Trade-offs

- **[Risk]** The modern frontend build may emit hashed chunk names that are awkward for the backend to reference directly. → **Mitigation:** define a stable bootstrap entry file and package the full dist directory beneath a dedicated static root.
- **[Risk]** A new public config DTO could accidentally omit fields the frontend currently relies on. → **Mitigation:** derive the DTO from the modern runtime's normalized config usage and keep the spec focused on behavior the bootstrap must preserve.
- **[Risk]** Custom-tool actions may be too limited and push users back toward script injection requests. → **Mitigation:** define a small but extensible action registry that covers current runtime capabilities and supports adding new safe actions over time.
- **[Risk]** Development-mode Vite injection could drift from production behavior. → **Mitigation:** keep one config ingestion path and vary only the source of the frontend module.
- **[Risk]** Removing legacy assets may break untracked references in docs or templates. → **Mitigation:** make legacy asset removal contingent on replacing all processor references and update documentation as part of the migration.

## Migration Plan

1. Introduce the public config payload and modern Halo bootstrap entry while keeping the existing runtime behavior intact.
2. Wire the frontend package build into Gradle resource processing so packaged plugin assets contain the modern bundle.
3. Replace executable custom-tool configuration with declarative action-backed tool definitions in the public config contract.
4. Enable the local development bootstrap path against the same backend-provided config payload.
5. Switch the backend processor to the new production entry path and remove remaining legacy static asset references.
6. Delete the old `live2d-autoload`-based assets after the new integration path is the only reachable bootstrap.

Rollback is straightforward: revert the backend processor and packaged asset path to the legacy bootstrap until the modern entry is fixed.

## Open Questions

- None. The remaining work is implementation planning and wiring rather than product-scope uncertainty.
