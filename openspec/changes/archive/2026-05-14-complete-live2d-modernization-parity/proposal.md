## Why

`packages/live2d` has already modernized most of the legacy `live2d-autoload.js` runtime, but a few legacy behaviors still have no equivalent or have regressed during the migration. Capturing those gaps now gives the project a concrete parity target before the old script stops being the functional reference.

## What Changes

- Audit the remaining behavior gaps between `packages/live2d` and `src/main/resources/static/js/live2d-autoload.js`, then codify the ones that should still be preserved in the modern runtime.
- Restore the legacy dismiss/reopen behavior so hiding the widget does not unnecessarily destroy and recreate the mounted runtime state during the same page session.
- Restore the `consoleShowStatu` compatibility contract so the modern runtime still exposes the legacy console status output beyond the current model-load log line.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `live2d-widget-behavior-parity`: expand parity requirements to cover the remaining legacy widget lifecycle and console status behaviors that are still missing from the modernized frontend.

## Impact

- Affected code: `packages/live2d/src/components/*`, `packages/live2d/src/live2d/model.ts`, and related config/runtime helpers where compatibility behavior is defined.
- Affected behavior: widget hide/show lifecycle, console compatibility output, and parity expectations tracked in OpenSpec.
- No backend API changes are expected; the work stays within the existing frontend runtime and current server contracts.
