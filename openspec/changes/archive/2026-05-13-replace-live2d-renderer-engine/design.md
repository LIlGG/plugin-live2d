## Context

The current frontend renderer lives in `packages/live2d/src/live2d/model.ts` and is tightly coupled to `pixi-live2d-display` plus PixiJS v6-style initialization. It imports both legacy Cubism runtime scripts, creates a `PIXI.Application` directly from the target canvas, loads models from the existing backend `get/?id=<modelId>-<textureId>` endpoint, and exposes toolbar-facing methods for model switching, texture switching, and screenshot capture.

The replacement engine, `untitled-pixi-live2d-engine`, targets PixiJS v8 and explicitly supports Cubism 2 / 3 / 4 / 5. That introduces a dependency upgrade, renderer bootstrap changes, and some API adaptation work, but the surrounding widget, event system, backend endpoints, and UnoCSS-driven UI should remain stable.

## Goals / Non-Goals

**Goals:**
- Move the renderer in `packages/live2d` to `untitled-pixi-live2d-engine`.
- Support Cubism 2 / 3 / 4 / 5 model assets without changing the current backend endpoint contract.
- Preserve the public widget lifecycle and existing tool behaviors (`loadModel`, `loadRandTextures`, `loadOtherModel`, `capture`).
- Keep the plugin's frontend integration self-contained so the server-side injection flow does not need a parallel legacy runtime path.

**Non-Goals:**
- Redesign the widget UI, tips system, or tool ordering.
- Change backend model management endpoints or add new model metadata APIs unless implementation proves it is strictly required.
- Add new Live2D features from the new engine such as lip-sync, parallel motion, or custom filters in this migration.

## Decisions

### 1. Upgrade the frontend renderer stack to PixiJS v8 together with the new Live2D engine

`untitled-pixi-live2d-engine` is built for PixiJS v8, so the migration should upgrade `pixi.js` and remove `pixi-live2d-display` in the same change. Keeping PixiJS v6 would force compatibility shims around the renderer core and defeat the purpose of moving to a maintained engine.

**Alternatives considered**
- Stay on `pixi-live2d-display`: rejected because the current maintenance gap is the reason for the change.
- Try to mix PixiJS v8 engine code with PixiJS v6 application code: rejected because the renderer and extraction APIs differ enough to make that fragile.

### 2. Keep a stable `Model` wrapper and adapt engine-specific behavior behind it

The widget and tooling already depend on the `Model` class methods in `packages/live2d/src/live2d/model.ts`. The migration should preserve that wrapper shape and refactor its internals so the rest of the component tree, custom tools, and event dispatch continue to work unchanged.

**Alternatives considered**
- Expose the engine model directly to the rest of the app: rejected because it would spread migration work across many files and make future renderer swaps harder.
- Keep the old wrapper and add a second parallel runtime: rejected because it would increase bundle and maintenance complexity without a clear need.

### 3. Use the engine entrypoint that can handle both legacy and modern Cubism runtimes

The current backend endpoints return asset URLs but do not expose Cubism generation metadata that the frontend can rely on ahead of time. The migration should therefore use the engine entrypoint that supports both legacy and modern Cubism models, while continuing to ship the required `live2d.min.js` and `live2dcubismcore.min.js` assets.

**Alternatives considered**
- Dynamically choose `cubism-legacy` vs `cubism` engine entrypoints per model: rejected for now because the current API does not provide a reliable version discriminator.
- Add a backend metadata endpoint first: rejected because it expands scope beyond the renderer replacement.

### 4. Preserve current model loading and toolbar workflows, but update Pixi bootstrap and extraction to v8-compatible patterns

The migrated runtime should continue to:
- resolve the initial model and texture IDs from config/local storage,
- fetch switch/texture data from the existing endpoints,
- emit the same user-facing messages,
- expose screenshot capture through the toolbar.

Internally, the Pixi application bootstrap, stage cleanup, and screenshot extraction should be rewritten for the v8 stack and validated inside the existing `live2d-canvas` lifecycle.

**Alternatives considered**
- Change tool behavior during the migration: rejected because the user-facing contract is already established and unrelated to engine selection.

## Risks / Trade-offs

- **[PixiJS v8 API migration may break canvas initialization or screenshot capture]** → Mitigation: isolate Pixi bootstrap/extract logic inside the `Model` wrapper and validate the current tool flows against the upgraded runtime.
- **[Loading both Cubism runtimes keeps bundle/runtime cost higher than a version-specific path]** → Mitigation: keep the current deferred page initialization and revisit per-model runtime selection in a later optimization change if needed.
- **[Backend model assets may expose edge cases the old engine tolerated differently]** → Mitigation: preserve endpoint contracts, surface load failures clearly, and test representative Cubism 2 and Cubism 3/4/5 models during implementation.

## Migration Plan

1. Replace frontend dependencies and regenerate the lockfile/build output required by the package.
2. Refactor `packages/live2d/src/live2d/model.ts` to initialize PixiJS v8 and `untitled-pixi-live2d-engine` behind the existing `Model` API.
3. Update any affected component/runtime integration points, including canvas initialization and screenshot extraction.
4. Validate that initial load, switch model, switch texture, and screenshot flows still work against the current backend endpoints.
5. Roll back by reverting the dependency/runtime changes if the new engine cannot load the existing model inventory safely.

## Open Questions

- Does the chosen engine integration require adding `@pixi/sound` immediately for the current feature set, or only when lip-sync/audio APIs are used?
- Do the plugin's existing model assets include at least one Cubism 2 model and one Cubism 3/4/5 model that can be used as regression fixtures during implementation?
