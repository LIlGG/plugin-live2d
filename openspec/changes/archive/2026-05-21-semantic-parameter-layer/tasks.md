## 1. Module Setup

- [x] 1.1 Create `packages/live2d/src/runtime/semantic/` directory structure
- [x] 1.2 Define TypeScript interfaces: `SemanticMapping`, `CapabilityProfile`, `BlendMode`
- [x] 1.3 Create `DEFAULT_SEMANTIC_MAPPINGS` registry with common Cubism 2/4/5 parameter names

## 2. Core Implementation

- [x] 2.1 Implement `SemanticParameterLayer` class with `registerSemantic()`, `detectFromModel()`
- [x] 2.2 Implement `ModelParameterAccessor` helper to normalize Cubism 2 vs 4/5 parameter structures
- [x] 2.3 Implement `setSemantic(name, value, blendMode)` with clamping to parameter bounds
- [x] 2.4 Implement `getSemantic(name)` returning current resolved parameter value
- [x] 2.5 Implement `hasSemantic(name)` returning boolean
- [x] 2.6 Implement `CapabilityProfile` generation from detected parameters

## 3. Model Integration

- [x] 3.1 Add `semanticLayer` property to `Model` class
- [x] 3.2 Call `detectFromModel()` in `Model.create()` after `Live2DModel` loads
- [x] 3.3 Expose `Model.getSemanticLayer()` public accessor
- [x] 3.4 Log capability profile to console when `consoleShowStatus` is enabled

## 4. Refactor Demonstration

- [x] 4.1 Optionally refactor `model.ts` head hit area detection to use semantic `head` lookup
- [x] 4.2 Verify no breaking changes to existing model loading flow

## 5. Testing

- [x] 5.1 Unit test: `detectFromModel` resolves `mouthOpen` for Cubism 2 model
- [x] 5.2 Unit test: `detectFromModel` resolves `mouthOpen` for Cubism 4/5 model
- [x] 5.3 Unit test: `setSemantic` with `override` replaces parameter value
- [x] 5.4 Unit test: `setSemantic` with `add` adds to parameter value
- [x] 5.5 Unit test: `setSemantic` clamps out-of-bounds values
- [x] 5.6 Unit test: `registerSemantic` adds custom mapping before detection
- [x] 5.7 Integration test: `CapabilityProfile` correctly categorizes detected/missing parameters
