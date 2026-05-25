## ADDED Requirements

### Requirement: DevTools panel displays runtime status
The system SHALL provide a floating panel that displays the real-time status of all runtime subsystems.

#### Scenario: Panel shows FSM state
- **WHEN** the DevTools panel is open
- **AND** the current FSM state is `idle`
- **THEN** the panel displays "idle" as the current state

#### Scenario: Panel shows emotion transition progress
- **WHEN** the DevTools panel is open
- **AND** a transition from `neutral` to `happy` is 50% complete
- **THEN** the panel shows a progress bar at 50% with "neutral → happy"

#### Scenario: Panel shows motion layer statuses
- **WHEN** the DevTools panel is open
- **AND** the `talk` layer is active with weight 0.8
- **THEN** the panel displays the talk layer as active with weight 0.8

#### Scenario: Panel shows active filters
- **WHEN** the DevTools panel is open
- **AND** a `happy-glow` filter is active
- **THEN** the panel lists "happy-glow" with its intensity

#### Scenario: Panel shows semantic parameter values
- **WHEN** the DevTools panel is open
- **AND** the `mouthSmile` parameter has value 0.6
- **THEN** the panel displays `mouthSmile: 0.6`

### Requirement: DevTools provides manual trigger buttons
The system SHALL provide buttons to manually trigger FSM states, emotions, and filter presets.

#### Scenario: Trigger FSM state from panel
- **WHEN** the user clicks the "happy" state button in the FSM section
- **THEN** `fsm.transitionTo('happy')` is called

#### Scenario: Trigger emotion from panel
- **WHEN** the user clicks the "angry" emotion button
- **THEN** `emotionTimeline.transitionTo('angry')` is called

#### Scenario: Apply filter from panel
- **WHEN** the user clicks the "shy-blush" filter button
- **THEN** `filterPipeline.applyPreset('shy-blush')` is called

#### Scenario: Toggle procedural module from panel
- **WHEN** the user unchecks the "Blink" toggle
- **THEN** the Blink module is disabled in the procedural system

### Requirement: DevTools is dev-only
The system SHALL ensure the DevTools component is not included in production builds.

#### Scenario: Production build excludes DevTools
- **WHEN** the application is built for production
- **THEN** the DevTools component code is not included in the bundle

### Requirement: DevTools toggle mechanism
The system SHALL support toggling the panel via keyboard shortcut and a corner indicator.

#### Scenario: Keyboard shortcut toggles panel
- **WHEN** the user presses `Ctrl+Shift+D`
- **THEN** the DevTools panel visibility toggles

#### Scenario: Corner indicator shows availability
- **WHEN** the DevTools panel is hidden
- **THEN** a small indicator icon is visible in the bottom-right corner
- **AND** clicking the indicator opens the panel
