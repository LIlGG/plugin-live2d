## Context

plugin-live2d uses `untitled-pixi-live2d-engine` which wraps Live2D models with a `Live2DModel` class exposing `internalModel`. Parameters are accessed directly via `internalModel.parameters` using string IDs. The current codebase in `model.ts` hardcodes parameter access patterns like `HEAD_HIT_AREA_PATTERN = /(head|flickhead)/i` and manually iterates hit areas. This approach breaks when models use non-standard naming conventions.

The project supports Cubism 2 through 5, and users may load VTubeStudio exports, custom models, or community models with varying parameter conventions. A semantic abstraction layer is needed before any higher-level runtime feature (procedural animation, AI hooks) can safely manipulate model parameters.

## Goals / Non-Goals

**Goals:**
- Provide a runtime-discovered mapping from semantic names to model-specific parameter IDs
- Support default mappings for common parameters across Cubism 2/4/5 conventions
- Allow runtime registration of custom semantic mappings
- Expose a `CapabilityProfile` showing which semantics are available on the current model
- Keep the API minimal: `get`, `set`, `has`, `register`

**Non-Goals:**
- Not a full parameter alias system (no user-defined aliases at runtime)
- No automatic parameter creation or modification of model structure
- No interpolation or animation — that belongs to Procedural Animation and Motion Layer systems
- No breaking changes to existing direct parameter access

## Decisions

### Two-phase initialization: detection then binding

The `SemanticParameterLayer` is instantiated empty, then populated via `detectFromModel(model)` after the model loads. This separates construction from the async model loading process and allows re-detection if the model changes.

**Alternative**: Detect inside the constructor. **Rejected** because model loading is async and the layer may need to exist before the model is ready (e.g., for pre-registration of custom mappings).

### Default mappings as a static registry with override support

A built-in `DEFAULT_SEMANTIC_MAPPINGS` object maps semantic names to arrays of candidate parameter IDs in priority order. Users can call `registerSemantic('customName', ['CANDIDATE_A', 'CANDIDATE_B'])` to add or override mappings before detection.

**Alternative**: Load mappings from an external JSON file. **Rejected** because the built-in set covers 90% of cases and external loading adds async complexity for marginal benefit.

### `set` supports `override` and `add` blend modes

When multiple systems (procedural animation, AI hooks, motion playback) try to set the same semantic parameter, they need a merge strategy. `set(semantic, value, 'override')` replaces the current value; `set(semantic, value, 'add')` adds to it (useful for breathing叠加).

**Alternative**: No blend mode, last-write-wins. **Rejected** because breathing叠加 on top of motion is a common and visually important case.

### CapabilityProfile exposes detected/missing/not-applicable

After detection, the layer produces a profile categorizing each semantic as:
- `detected`: parameter found and mapped
- `missing`: parameter not found but expected (warned, not errored)
- `not-applicable`: semantic known to not exist for this model type (e.g., Cubism 2 breath parameter on Cubism 5 model with different convention)

This lets higher-level systems adapt behavior (e.g., disable lip sync if `mouthOpen` is missing).

## Risks / Trade-offs

- **[Risk]** `untitled-pixi-live2d-engine`'s `internalModel.parameters` structure may differ between Cubism 2 and Cubism 4/5. → **Mitigation**: Abstract the parameter enumeration in a `ModelParameterEnumerator` helper that normalizes both structures to a common `{ ids: string[], getValue(id), setValue(id, value) }` interface.
- **[Risk]** Non-standard models may have parameters that semantically match but use completely unexpected names. → **Mitigation**: `registerSemantic()` allows users to add mappings. Future: optional fuzzy matching based on parameter range and default value heuristics.
- **[Risk]** Parameter IDs in Cubism 5 may include new prefixes or conventions not in our default registry. → **Mitigation**: The registry is a plain object, easily extensible. We target Cubism 2/4/5 common conventions.
- **[Risk]** Overhead of semantic lookup on every frame. → **Mitigation**: After detection, store direct references to the parameter index/ID. `set()` is O(1) after initialization.

## Migration Plan

1. Create `runtime/semantic/` module with `SemanticParameterLayer` and `CapabilityProfile`
2. Integrate into `Model.create()`: instantiate layer, call `detectFromModel()`, store on model instance
3. Optionally refactor `model.ts` hit area detection to use semantic `head` lookup (demonstrates usage)
4. Expose layer to external consumers via `Model.getSemanticLayer()`
5. Higher-level systems (Procedural Animation, AI Hooks) import and use the layer

Rollback: Remove `detectFromModel()` call in `Model.create()`; all other code is additive.

## Open Questions

- Should the layer cache parameter values to avoid redundant `get()` calls? (Probably yes, with a `sync()` method called once per frame.)
- How should `add` mode handle out-of-bounds values? (Clamp to parameter's defined min/max range.)
