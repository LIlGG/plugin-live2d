## Context

The Lit-based frontend has already replaced the legacy autoload script for rendering, tips dispatch, and toolbar actions. After narrowing the parity review, the confirmed missing feature is specific: when a configured full TIPS source fails to load, the modern runtime does not fall back to the bundled `live2d-tips.json` file the way the legacy script did.

Other previously discussed items are intentionally excluded from this change. In particular, `hitokoto` handling is currently treated as standardized behavior in the new runtime rather than a confirmed feature regression, and broader lifecycle or config-compatibility items are treated as follow-up optimizations unless they later prove to be user-facing breakages.

## Goals / Non-Goals

**Goals:**
- Restore the legacy tips fallback contract in a typed, explicit way.
- Keep the modern component architecture, UnoCSS styling, and event-driven runtime unchanged outside the fallback fix.
- Limit the work to the one confirmed user-facing parity gap.

**Non-Goals:**
- Recreate the legacy autoload DOM structure or CSS implementation.
- Change backend API contracts or toolbar behavior.
- Reclassify standardization or optimization items as feature regressions without new evidence.

## Decisions

### Make tips loading return an explicit success-or-fallback signal
The legacy script treated a missing or invalid configured tips file as a trigger to fall back to the bundled default tips. The modern loader currently resolves an empty object on failure, which prevents the fallback branch from being reached. The replacement should make the fallback decision explicit by distinguishing “loaded tip config” from “failed/empty result,” then merging plugin/theme/default tips only after the full source is chosen.

**Alternative considered:** keep the current helper shape and infer failure from empty objects later. This keeps call sites unchanged, but it is brittle because an empty object is also a valid JavaScript value and silently hides fallback decisions.

## Risks / Trade-offs

- **Tips fallback changes may alter current edge-case behavior for malformed custom files** → Keep the merge order unchanged and only change the source-selection decision when the configured full tips file is unusable.
- **A narrow fix can leave adjacent cleanup for later** → Explicitly document that the current scope is intentionally limited to the confirmed TIPS fallback regression.
