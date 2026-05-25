## Why

The modern `packages/live2d` runtime now covers the widget behavior that previously lived in `src/main/resources/static/js/live2d-autoload.js`, but the Halo plugin still boots the legacy script and ships the old static asset set. That split keeps legacy code, blocks a clean frontend/backend integration path, and makes local debugging and release packaging harder than they need to be.

## What Changes

- Replace the backend's legacy `live2d-autoload.min.js` injection with a modern frontend bootstrap entry that starts the Lit-based runtime inside Halo pages.
- Package the frontend build output as plugin static assets during the plugin build so production JARs ship the modern runtime and its chunks without manual copying.
- Define a public backend-to-frontend configuration contract for the widget instead of exposing a broad raw settings object, while preserving the runtime fields the frontend still needs.
- Add a declarative custom-tool extension model so plugin users can configure extra Live2D tools in Halo without injecting arbitrary frontend code.
- Add a development integration path so Halo pages can load the modern frontend from a Vite dev server during local debugging without changing the production bootstrap flow.
- Remove legacy frontend assets and bootstrap code that become unreachable after the modern integration is in place.

## Capabilities

### New Capabilities
- `halo-plugin-frontend-integration`: The Halo plugin boots the modern frontend bundle, packages its build output into plugin assets, and supports both production and local development loading flows.
- `live2d-public-runtime-config`: The backend publishes a dedicated public Live2D runtime config payload for frontend consumption instead of passing a broad settings object directly into inline initialization code.
- `live2d-custom-tool-actions`: Plugin users can declare custom tools in backend settings that bind to a supported set of frontend-exposed Live2D actions without executing arbitrary scripts.

### Modified Capabilities
- `multi-cubism-live2d-rendering`: The renderer integration currently assumes the legacy injected initialization contract remains sufficient; this change updates that requirement so the maintained renderer works with the new Halo bootstrap and public config contract.

## Impact

- Affected backend code: `Live2dInitProcessor`, settings/config mapping, plugin build wiring, and any development-mode plugin bootstrap support.
- Affected frontend code: runtime bootstrap entry, config ingestion, custom tool action handling, asset path expectations, and local development workflow.
- Affected packaged assets: legacy `static/js`, `static/css`, and `static/lib` resources tied to `live2d-autoload` are expected to be retired once the new bundle-based path is active.
- Affected developer workflow: plugin builds and local debugging will depend on the frontend package build/dev flow being wired into the plugin lifecycle.
