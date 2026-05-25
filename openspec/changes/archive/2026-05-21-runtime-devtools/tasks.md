## 1. Runtime Controller Core

- [x] 1.1 Create `packages/live2d/src/runtime/controller/` directory
- [x] 1.2 Define `Live2dRuntimeController` class with subsystem ownership
- [x] 1.3 Move BehaviorFSM initialization from Model to Controller
- [x] 1.4 Move EmotionTimeline initialization from Model to Controller
- [x] 1.5 Move MotionLayerSystem initialization from Model to Controller
- [x] 1.6 Move FilterPipeline initialization from Model to Controller
- [x] 1.7 Move ProceduralAnimationSystem initialization from Model to Controller
- [x] 1.8 Implement `controller.get*()` accessors for all subsystems
- [x] 1.9 Implement `controller.destroy()` with proper cleanup order
- [x] 1.10 Refactor Model class to delegate to Controller

## 2. Conflict Resolution

- [x] 2.1 Define `SystemPriority` enum (manual=1, fsm=2, emotion=3, motion=4, procedural=5)
- [x] 2.2 Implement `ParameterWriteQueue` to collect writes per frame
- [x] 2.3 Implement conflict detection (same param, same frame, different sources)
- [x] 2.4 Implement priority-based resolution (highest wins)
- [x] 2.5 Implement conflict log (parameter, losing system, winning system, values)
- [x] 2.6 Integrate resolution into controller's update cycle

## 3. Unified Transition API

- [x] 3.1 Implement `controller.transitionTo({ fsm?, emotion?, filter? })`
- [x] 3.2 Ensure cross-system transitions are atomic
- [x] 3.3 Add `controller.getCurrentState()` returning composite state
- [x] 3.4 Unit test: FSM + emotion coordinated transition
- [x] 3.5 Unit test: Filter application during state transition

## 4. DevTools Panel Component

- [x] 4.1 Create `packages/live2d/src/components/Live2dDevTools/` directory
- [x] 4.2 Create `Live2dDevTools` Lit/React component scaffold
- [x] 4.3 Implement panel container with drag handle
- [x] 4.4 Implement accordion section layout
- [x] 4.5 Implement `Ctrl+Shift+D` keyboard shortcut toggle
- [x] 4.6 Implement corner indicator (`🔧`) when panel is hidden
- [x] 4.7 Store panel position in localStorage
- [x] 4.8 Guard rendering with `import.meta.env.DEV`

## 5. DevTools FSM Section

- [x] 5.1 Display current FSM state name
- [x] 5.2 Display transition history (last 5 transitions)
- [x] 5.3 Add state trigger buttons (idle, happy, thinking, talking, etc.)
- [x] 5.4 Show guard status (can/cannot transition to each state)
- [x] 5.5 Unit test: Clicking state button triggers transition

## 6. DevTools Emotion Section

- [x] 6.1 Display current emotion name
- [x] 6.2 Display transition progress bar (when transitioning)
- [x] 6.3 Add emotion trigger buttons (neutral, happy, sad, angry, etc.)
- [x] 6.4 Show current interpolated parameter values
- [x] 6.5 Unit test: Clicking emotion button triggers transition

## 7. DevTools Motion Layer Section

- [x] 7.1 Display layer status table (name, state, weight, priority)
- [x] 7.2 Show active parameters per layer
- [x] 7.3 Add layer trigger buttons (play/stop for each layer)
- [x] 7.4 Unit test: Layer status updates in real-time

## 8. DevTools Filter Section

- [x] 8.1 Display active effects list
- [x] 8.2 Add intensity sliders for each active effect
- [x] 8.3 Add preset trigger buttons (happy-glow, shy-blush, angry-red, etc.)
- [x] 8.4 Add "Clear All" button
- [x] 8.5 Unit test: Clicking preset button applies effect

## 9. DevTools Semantic Parameter Section

- [x] 9.1 Display live parameter value grid (name + value)
- [x] 9.2 Add manual parameter sliders
- [x] 9.3 Highlight parameters currently being written by any system
- [x] 9.4 Unit test: Slider changes parameter value

## 10. DevTools Procedural Section

- [x] 10.1 Display module toggle switches (breathing, blink, eye tracking)
- [x] 10.2 Show module configuration (period, amplitude, etc.)
- [x] 10.3 Unit test: Toggling module enables/disables it

## 11. DevTools Conflict Log Section

- [x] 11.1 Display recent conflicts in a scrollable list
- [x] 11.2 Show timestamp, parameter, losing system, winning system
- [x] 11.3 Add "Clear Log" button
- [x] 11.4 Unit test: Conflict appears in log when detected

## 12. Integration & Production Safety

- [x] 12.1 Integrate DevTools into `Demo.tsx` (dev-only)
- [x] 12.2 Ensure DevTools is NOT imported in `index.ts` (production entry)
- [x] 12.3 Add `devTools` config to `Live2dConfig`
- [x] 12.4 Verify production build excludes DevTools code
- [x] 12.5 Integration test: Full workflow — trigger state → observe emotion → apply filter
