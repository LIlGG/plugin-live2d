## 1. Module Setup

- [x] 1.1 Create `packages/live2d/src/runtime/behavior/` directory structure
- [x] 1.2 Define TypeScript interfaces: `BehaviorFSM`, `BehaviorState`, `BehaviorProfile`, `TransitionGuard`
- [x] 1.3 Define built-in states: idle, thinking, talking, embarrassed, angry, sleepy, happy, sad

## 2. Core FSM Implementation

- [x] 2.1 Implement `BehaviorFSM` class with state registry
- [x] 2.2 Implement `transitionTo()` with guard validation
- [x] 2.3 Implement state entry/exit hooks
- [x] 2.4 Implement `getCurrentState()` and `canTransitionTo()` query APIs
- [x] 2.5 Implement transition debounce (minimum time between transitions)

## 3. Profile System

- [x] 3.1 Implement `BehaviorProfile` application to MotionLayerSystem
- [x] 3.2 Implement `BehaviorProfile` application to FilterPipeline
- [x] 3.3 Implement `BehaviorProfile` application to SemanticParameterLayer
- [x] 3.4 Implement profile reversal on state exit
- [x] 3.5 Support profile inheritance (base + override)

## 4. Built-in States

- [x] 4.1 Define `idle` state profile
- [x] 4.2 Define `happy` state profile
- [x] 4.3 Define `sad` state profile
- [x] 4.4 Define `angry` state profile
- [x] 4.5 Define `embarrassed` state profile (blush filter)
- [x] 4.6 Define `thinking` state profile
- [x] 4.7 Define `talking` state profile
- [x] 4.8 Define `sleepy` state profile

## 5. Integration

- [x] 5.1 Add `behaviorFSM` property to `Model` class
- [x] 5.2 Initialize FSM in `Model` lifecycle after MotionLayerSystem
- [x] 5.3 Expose `Model.getBehaviorFSM()` public accessor
- [x] 5.4 Add `behaviorFSM` config to `Live2dConfig`

## 6. Testing

- [x] 6.1 Unit test: State transition with valid guard
- [x] 6.2 Unit test: State transition blocked by invalid guard
- [x] 6.3 Unit test: Entry profile applied on state enter
- [x] 6.4 Unit test: Exit profile applied on state exit
- [x] 6.5 Unit test: Transition debounce prevents rapid switching
- [x] 6.6 Unit test: Profile inheritance works correctly
- [x] 6.7 Integration test: Full state cycle idle -> happy -> embarrassed -> idle
