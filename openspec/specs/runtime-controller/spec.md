# runtime-controller Specification

## Purpose
TBD - created by archiving change runtime-devtools. Update Purpose after archive.
## Requirements
### Requirement: Controller owns subsystem lifecycle
The system SHALL provide a `Live2dRuntimeController` class that instantiates and manages all runtime subsystems.

#### Scenario: Controller initializes after model load
- **WHEN** a Live2D model is loaded
- **AND** `Live2dRuntimeController` is instantiated with the loaded model
- **THEN** all runtime subsystems (BehaviorFSM, EmotionTimeline, MotionLayerSystem, FilterPipeline, ProceduralAnimationSystem, SemanticParameterLayer) are created and initialized

#### Scenario: Controller exposes subsystem access
- **WHEN** external code calls `controller.getBehaviorFSM()`
- **THEN** the BehaviorFSM instance is returned
- **AND** calling `controller.getEmotionTimeline()` returns the EmotionTimeline instance

### Requirement: Controller provides unified transition API
The system SHALL expose a unified `transitionTo({ fsm?, emotion?, filter? })` method that coordinates cross-system transitions.

#### Scenario: Coordinated state and emotion transition
- **WHEN** `controller.transitionTo({ fsm: 'talking', emotion: 'happy' })` is called
- **THEN** the FSM transitions to `talking`
- **AND** the EmotionTimeline transitions to `happy`
- **AND** parameter conflicts are resolved by the controller

### Requirement: Controller destroys all subsystems
The system SHALL provide a `destroy()` method that cleans up all owned subsystems.

#### Scenario: Model destruction propagates to controller
- **WHEN** `controller.destroy()` is called
- **THEN** all subsystems are destroyed in dependency order
- **AND** no memory leaks or dangling timers remain

