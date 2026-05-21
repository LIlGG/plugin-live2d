## Tasks

- [x] 1. Replace the Halo bootstrap path
  - [x] 1.1 Add a dedicated frontend bootstrap entry for Halo pages that reads the backend-provided public config payload and starts the modern runtime.
  - [x] 1.2 Update `Live2dInitProcessor` to inject the public config payload plus the modern frontend entry instead of `live2d-autoload.min.js` and inline `live2d.init(...)`.

- [x] 2. Define the public runtime config contract
  - [x] 2.1 Replace the current merged-settings exposure with an explicit backend public config mapper or DTO for frontend-safe fields.
  - [x] 2.2 Update the frontend bootstrap/runtime config ingestion to consume the new public payload while preserving existing widget behavior.
  - [x] 2.3 Include declarative `customTools` definitions in the public payload when configured.

- [x] 3. Replace executable custom tools with safe declarative actions
  - [x] 3.1 Define a frontend action registry for backend-configured custom tools instead of accepting executable callback or script content.
  - [x] 3.2 Support an initial action set covering message display, widget visibility, chat toggling, model or texture switching, screenshot capture, URL opening, custom event emission, and any explicit safe model-loading action chosen for the first release.
  - [x] 3.3 Add backend settings/schema support for configuring custom tools against that declarative action contract.

- [x] 4. Wire frontend packaging into the plugin build
  - [x] 4.1 Add plugin build tasks that build `packages/live2d` and synchronize its output into packaged plugin static assets under a dedicated runtime root.
  - [x] 4.2 Ensure the backend injects a stable production entry path while allowing emitted chunks and assets to resolve correctly.

- [x] 5. Support local Halo-page debugging
  - [x] 5.1 Add a development-mode bootstrap path that targets the Vite dev server entry for `packages/live2d`.
  - [x] 5.2 Keep production and development loading modes on the same public config contract so only the module source changes.

- [x] 6. Remove legacy assets after cutover
  - [x] 6.1 Delete the legacy `live2d-autoload` bootstrap assets and any unreachable old CSS/lib resources once no backend references remain.
  - [x] 6.2 Update related documentation and resource references to describe the modern integration flow.
