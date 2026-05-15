## Why

The frontend Live2D runtime currently depends on `pixi-live2d-display`, an unmaintained renderer tied to an older PixiJS stack. That blocks reliable support for newer Cubism model formats and makes future renderer fixes increasingly risky.

## What Changes

- Replace the frontend renderer dependency in `packages/live2d` from `pixi-live2d-display` to `untitled-pixi-live2d-engine`.
- Upgrade the Live2D canvas/runtime integration so the plugin can render Cubism 2 / 3 / 4 / 5 models through the new engine.
- Keep the existing plugin-facing behavior for model loading, model switching, texture switching, screenshot capture, and event dispatch while adapting the underlying renderer implementation.
- Preserve compatibility with the current backend model endpoints (`get`, `switch`, `rand_textures`) so the server contract does not need to change for this migration.
- Refresh package/build metadata and bundled runtime loading so the new renderer's PixiJS and Cubism requirements are satisfied in the shipped frontend bundle.

## Capabilities

### New Capabilities
- `multi-cubism-live2d-rendering`: Render Live2D models in the plugin with a maintained Pixi-based engine that supports Cubism 2 / 3 / 4 / 5 while preserving the current widget lifecycle and user tools.

### Modified Capabilities
- None.

## Impact

- Affected code: `packages/live2d/package.json`, `packages/live2d/src/live2d/model.ts`, `packages/live2d/src/components/Live2dCanvas.tsx`, and related runtime/tool integration files.
- Dependencies: replace `pixi-live2d-display`, upgrade `pixi.js`, and align bundled Cubism runtime assets with the new engine.
- Systems: frontend rendering pipeline, model lifecycle handling, screenshot extraction, and compatibility with existing Live2D API responses.
