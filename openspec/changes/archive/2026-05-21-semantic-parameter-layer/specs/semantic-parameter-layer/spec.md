## ADDED Requirements

### Requirement: Map semantic names to model parameters
The system SHALL maintain a registry that maps semantic names (e.g., `mouthOpen`) to arrays of candidate parameter IDs. When a model is loaded, the system SHALL resolve each semantic to the first available candidate parameter on that model.

#### Scenario: Parameter resolution for Cubism 4 model
- **WHEN** a Cubism 4 model is loaded with parameter `PARAM_MOUTH_A`
- **AND** the semantic `mouthOpen` maps to candidates `['PARAM_MOUTH_OPEN_Y', 'PARAM_MOUTH_A', 'MOUTH_OPEN']`
- **THEN** the system resolves `mouthOpen` to `PARAM_MOUTH_A`

#### Scenario: Parameter resolution for Cubism 2 model
- **WHEN** a Cubism 2 model is loaded with parameter `PARAM_MOUTH_OPEN_Y`
- **AND** the semantic `mouthOpen` maps to the same candidate list
- **THEN** the system resolves `mouthOpen` to `PARAM_MOUTH_OPEN_Y`

### Requirement: Set semantic parameter values
The system SHALL provide a `setSemantic(name, value, blendMode)` method that writes the value to the resolved parameter. The blendMode SHALL be either `override` (replace) or `add` (add to existing).

#### Scenario: Override blend mode
- **WHEN** `setSemantic('angleX', 15, 'override')` is called
- **THEN** the model's resolved `angleX` parameter is set to `15`

#### Scenario: Add blend mode
- **WHEN** the current `angleX` parameter value is `10`
- **AND** `setSemantic('angleX', 5, 'add')` is called
- **THEN** the model's resolved `angleX` parameter becomes `15`

### Requirement: Get semantic parameter values
The system SHALL provide a `getSemantic(name)` method that returns the current value of the resolved parameter, or `undefined` if the semantic is not mapped.

#### Scenario: Reading a mapped parameter
- **WHEN** `getSemantic('mouthOpen')` is called on a model where `mouthOpen` is resolved
- **AND** the current parameter value is `0.3`
- **THEN** the method returns `0.3`

#### Scenario: Reading an unmapped parameter
- **WHEN** `getSemantic('customParam')` is called and no mapping exists
- **THEN** the method returns `undefined`

### Requirement: Register custom semantic mappings
The system SHALL allow runtime registration of custom semantic mappings via `registerSemantic(name, candidateIds)`.

#### Scenario: Register custom mapping before model load
- **WHEN** `registerSemantic('earWiggle', ['PARAM_EAR_L', 'CUSTOM_EAR'])` is called
- **AND** a model with parameter `PARAM_EAR_L` is subsequently loaded
- **THEN** the semantic `earWiggle` resolves to `PARAM_EAR_L`

### Requirement: Clamp values to parameter bounds
The system SHALL clamp written values to the parameter's defined minimum and maximum range.

#### Scenario: Value clamping
- **WHEN** a parameter has range `[-30, 30]`
- **AND** `setSemantic('angleX', 50, 'override')` is called
- **THEN** the parameter is set to `30` (clamped to max)
