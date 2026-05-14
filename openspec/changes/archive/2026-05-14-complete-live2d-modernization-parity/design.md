## Context

`packages/live2d` has replaced most of `live2d-autoload.js` with Lit components, typed config normalization, and modular tools. The remaining gaps are not renderer-level gaps anymore; they are compatibility gaps in widget lifecycle and console status behavior.

Today the modern widget unmounts the canvas subtree when it is hidden, which forces model recreation and re-runs initialization flows on reopen. The modern runtime also normalizes `consoleShowStatu`, but it only logs model-load completion instead of preserving the legacy console status output.

## Goals / Non-Goals

**Goals:**
- Preserve the modern Lit/UnoCSS architecture while restoring the remaining user-visible legacy behaviors that still matter.
- Keep widget hide/show behavior stateful within the same page session so reopen does not recreate the runtime unnecessarily.
- Reintroduce the `consoleShowStatu` compatibility behavior in a maintainable way.

**Non-Goals:**
- Reintroduce legacy DOM structure, legacy CSS files, or script-loader based initialization.
- Change backend APIs or introduce new server-side endpoints.
- Change the current hitokoto implementation beyond leaving it in its present modernized state.
- Achieve byte-for-byte parity with the old script where the modern implementation is intentionally better.

## Decisions

### Keep the widget subtree mounted and separate visibility from initialization
The modern runtime should stop using conditional rendering to remove the widget subtree on hide. Instead, the widget should mount once, keep the canvas/tools/tips subtree alive, and switch between visible and hidden presentation states.

This preserves the current model instance, avoids repeat model fetches on reopen, and matches the legacy expectation that dismissing the widget is a temporary hide instead of a teardown. The alternative was to keep the current remount behavior and patch over the regressions with cache/localStorage state, but that still recreates listeners and model state and would not match the legacy behavior as closely.

### Extract console compatibility output into a dedicated helper
The legacy `consoleShowStatu` behavior combined a compatibility banner with status logging. The modern runtime should implement that as an explicit helper with stable metadata constants instead of reproducing the obfuscated legacy snippet.

This keeps the behavior readable and testable while preserving the observable contract exposed by the legacy config flag. The alternative was to leave the partial implementation in `model.ts`, but that would continue to advertise compatibility without actually providing the legacy output.

## Risks / Trade-offs

- **[Risk]** Keeping the widget mounted means the renderer stays alive while hidden. → **Mitigation:** only preserve state within the current page session and continue using the existing explicit quit/toggle controls instead of background polling or reloading.
- **[Risk]** Console compatibility output may diverge from the old banner formatting. → **Mitigation:** preserve the same information contract (`version`, `updateTime`, and status intent) without copying the obfuscated implementation.

## Migration Plan

1. Add spec coverage for widget lifecycle parity and console status compatibility.
2. Refactor the widget visibility flow so quit/toggle hide the mounted runtime instead of tearing it down.
3. Add a console compatibility helper and wire it to normalized config flags.
4. Verify the existing modern runtime still preserves the already-migrated renderer and tips behaviors.

## Open Questions

- None. The remaining gaps are well-defined by the legacy script and current implementation.
