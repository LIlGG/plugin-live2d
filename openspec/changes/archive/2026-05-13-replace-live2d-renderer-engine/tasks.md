## 1. Dependency and runtime setup

- [x] 1.1 Replace `pixi-live2d-display` with `untitled-pixi-live2d-engine` in `packages/live2d/package.json` and align `pixi.js` with the renderer's supported major version.
- [x] 1.2 Add any required companion dependencies/runtime assets for the new engine and refresh the workspace lockfile/build inputs.

## 2. Renderer migration

- [x] 2.1 Refactor `packages/live2d/src/live2d/model.ts` to initialize PixiJS v8 and `untitled-pixi-live2d-engine` behind the existing `Model` wrapper API.
- [x] 2.2 Keep initial model loading compatible with the current config and `get/?id=<modelId>-<textureId>` endpoint contract while supporting Cubism 2 / 3 / 4 / 5 assets.
- [x] 2.3 Update model replacement, texture switching, and screenshot export logic to use the new renderer without changing toolbar behavior.

## 3. Integration and verification

- [x] 3.1 Adjust any affected component/runtime integration points so `Live2dCanvas` and widget lifecycle events continue to work with the migrated renderer.
- [x] 3.2 Build the frontend package and verify initial load, switch-model, switch-texture, and screenshot flows against representative plugin model assets.
- [x] 3.3 Update directly related documentation or migration notes if dependency/runtime requirements changed for plugin maintainers.
