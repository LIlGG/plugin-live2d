## ADDED Requirements

### Requirement: Detect available semantic parameters from model
After model loading, the system SHALL scan the model's parameters and produce a `CapabilityProfile` listing which semantic parameters are available.

#### Scenario: Full capability detection
- **WHEN** a model with parameters `['PARAM_ANGLE_X', 'PARAM_MOUTH_A', 'PARAM_EYE_L_OPEN']` is loaded
- **AND** the semantic registry includes `angleX`, `mouthOpen`, `eyeLOpen`, `breath`
- **THEN** the capability profile reports `angleX`, `mouthOpen`, `eyeLOpen` as detected
- **AND** reports `breath` as missing

### Requirement: Categorize parameter availability
The capability profile SHALL categorize each known semantic as `detected`, `missing`, or `not-applicable`.

#### Scenario: Not-applicable semantics
- **WHEN** a Cubism 2 model is loaded
- **AND** a Cubism-5-only semantic (e.g., `paramRepeat`) is in the registry
- **THEN** that semantic is categorized as `not-applicable`

### Requirement: Expose missing parameters for diagnostics
The capability profile SHALL expose a list of missing semantics so higher-level systems can adapt their behavior or warn users.

#### Scenario: Missing mouth parameter disables lip sync
- **WHEN** the `mouthOpen` semantic is missing from the capability profile
- **AND** the text lip sync system checks capability before activation
- **THEN** lip sync is gracefully disabled

### Requirement: O(1) parameter access after detection
After initial detection, semantic parameter read/write operations SHALL be O(1) via cached direct references.

#### Scenario: Performance guarantee
- **WHEN** 50 semantic `set` operations are performed in a single frame
- **THEN** total time is under 1ms on mid-tier hardware
