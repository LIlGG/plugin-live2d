## ADDED Requirements

### Requirement: Widget dismissal SHALL preserve mounted runtime state during the current page session
The modern widget SHALL treat quit and toggle dismissal as a visibility change instead of tearing down the mounted runtime subtree, so the current model and tool state remain available when the widget is reopened on the same page.

#### Scenario: Quit hides the mounted widget without resetting the current model
- **WHEN** a user dismisses the widget through the `quit` tool after switching to another model or texture
- **THEN** the widget MUST transition to a hidden state without recreating the Live2D runtime immediately
- **AND** reopening the widget during the same page session MUST continue from the current model state instead of reloading the default model

#### Scenario: Reopening after dismissal does not duplicate initialization side effects
- **WHEN** the widget is hidden and then shown again on the same page
- **THEN** the runtime MUST not register duplicate tip listeners or re-run first-open initialization solely because of that visibility change

### Requirement: Console status compatibility SHALL remain available through the legacy config flag
When `consoleShowStatus` or its legacy alias `consoleShowStatu` is enabled, the modern runtime SHALL preserve the observable console compatibility output expected from the legacy widget runtime.

#### Scenario: Console compatibility output includes widget metadata and load status
- **WHEN** the widget initializes with console status output enabled
- **THEN** the runtime MUST emit readable console output that includes the plugin version/update metadata represented by the legacy runtime
- **AND** it MUST continue emitting model load completion status for the requested model selection
