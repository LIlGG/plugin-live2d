## Why

Different Cubism versions and non-standard models use different parameter names for the same semantic concept. For example, mouth openness might be `PARAM_MOUTH_OPEN_Y` (Cubism 2), `PARAM_MOUTH_A` (Cubism 4/5), or `CUSTOM_MOUTH` (VTubeStudio-style models). Currently, any code that manipulates Live2D parameters must hardcode specific parameter names, making the runtime fragile and model-dependent. A Semantic Parameter Layer provides a unified API where callers use semantic names (like `mouthOpen`, `eyeLOpen`) while the runtime maps these to the actual model parameters.

## What Changes

- Introduce `SemanticParameterLayer` class that maps semantic names to model-specific parameter names
- Implement runtime parameter detection: scan a loaded model to discover which semantic parameters are available
- Provide `getSemantic()`, `setSemantic()`, `hasSemantic()`, and `registerSemantic()` APIs
- Build a default mapping registry covering common parameters across Cubism 2/4/5 conventions
- Update existing model parameter access (e.g., hit area detection in `model.ts`) to use the semantic layer where applicable
- Expose a capability profile (`CapabilityProfile`) listing detected vs missing semantic parameters per model

## Capabilities

### New Capabilities
- `semantic-parameter-layer`: Unified semantic API for Live2D parameter access with automatic model detection
- `parameter-capability-detection`: Runtime discovery of which semantic parameters a model supports

### Modified Capabilities
- (none — this is a foundational layer that existing code can opt into incrementally)

## Impact

- **Frontend runtime**: New `packages/live2d/src/runtime/semantic/` directory
- **Model initialization**: `Model.create()` will instantiate and populate `SemanticParameterLayer` after loading
- **Existing code**: `model.ts` hit area / head detection can optionally use semantic lookups; no breaking changes
- **Future features**: Procedural Animation and AI Runtime Hooks will depend on this layer
