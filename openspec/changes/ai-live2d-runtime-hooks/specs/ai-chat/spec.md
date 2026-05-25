## MODIFIED Requirements

### Requirement: Backend system prompt includes emotion markers
The backend `AiChatEndpoint` SHALL include emotion marker guidance in the system prompt sent to the LLM when AI hooks are enabled.

#### Scenario: Emotion marker output
- **WHEN** a chat request is processed with AI hooks enabled
- **THEN** the system prompt instructs the LLM to embed emotion markers like `[happy]`, `[shy]`, `[surprised]` at appropriate positions in the response text

#### Scenario: Backward compatibility when disabled
- **WHEN** AI hooks are disabled
- **THEN** the system prompt does not include emotion marker instructions
- **AND** the LLM responds with plain text only

## ADDED Requirements

### Requirement: Frontend configuration for AI hooks
The public runtime config SHALL include an `aiHooksEnabled` boolean field defaulting to `false`.

#### Scenario: Config-driven enablement
- **WHEN** the config contains `aiHooksEnabled: true`
- **THEN** the frontend initializes the AI Runtime Hooks layer
- **WHEN** the config contains `aiHooksEnabled: false`
- **THEN** the AI Runtime Hooks layer is not initialized and chat behaves as before
