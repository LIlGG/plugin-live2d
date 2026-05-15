## Why

The modern Live2D runtime already covers the rendering, tool, and most tip flows. After narrowing the comparison with `src/main/resources/static/js/live2d-autoload.js`, the only clear missing user-facing feature is that a broken or unavailable custom full TIPS source no longer falls back to the bundled default TIPS file.

## What Changes

- Restore the legacy full-TIPS fallback contract so the bundled default `live2d-tips.json` is used when a configured custom `tipsPath` resource is missing or invalid.
- Keep the modern Lit and UnoCSS architecture while correcting the source-selection logic for full TIPS loading.
- Add regression coverage for the fallback chain so future refactors do not silently drop default TIPS behavior again.
- Record that other previously discussed items, such as `hitokoto` response handling, are currently treated as standardization or optimization rather than confirmed missing features.

## Capabilities

### New Capabilities
- `live2d-widget-behavior-parity`: Preserve the remaining confirmed user-facing parity gap by restoring bundled default TIPS fallback when custom full TIPS loading fails.

### Modified Capabilities

## Impact

- Affected code: `packages/live2d/src/events/tip-events.ts`, `packages/live2d/src/helpers/loadTipsResource.ts`
- Affected behavior: fallback from configured `tipsPath` to bundled default full TIPS
- No backend API or UI surface expansion is required; changes stay within the existing frontend tip-loading flow
