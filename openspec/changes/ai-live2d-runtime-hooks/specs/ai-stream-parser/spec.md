## ADDED Requirements

### Requirement: Extract emotion markers from SSE chunks
The parser SHALL scan incoming SSE text chunks for embedded emotion markers in the format `[emotion-name]` where `emotion-name` is a registered emotional state key.

#### Scenario: Single emotion marker in chunk
- **WHEN** an SSE chunk contains text `你好呀！[happy] 今天真开心～`
- **THEN** the parser emits `{ text: "你好呀！ 今天真开心～", commands: [{ type: "emotion", emotion: "happy", position: 4 }] }`

#### Scenario: Multiple emotion markers in chunk
- **WHEN** an SSE chunk contains `[happy]欢迎！[shy]人家有点紧张……`
- **THEN** the parser emits two emotion commands with their respective positions and the stripped text `欢迎！人家有点紧张……`

### Requirement: Support configurable emotion vocabulary
The parser SHALL accept a configurable set of valid emotion marker names at initialization time. Unrecognized markers SHALL be ignored and left in the text.

#### Scenario: Unknown marker is preserved
- **WHEN** the configured vocabulary is `["happy", "shy", "sad"]` and a chunk contains `[unknown]hello`
- **THEN** the parser emits `{ text: "[unknown]hello", commands: [] }`

### Requirement: Estimate timestamp for each command
The parser SHALL assign an estimated display timestamp to each extracted command based on character position within the cumulative text stream.

#### Scenario: Timestamp estimation
- **WHEN** 10 characters have already been processed and a new chunk of `hello[happy]world` arrives
- **THEN** the `happy` command receives a timestamp estimate of `5` (the position of the marker in the chunk)

## MODIFIED Requirements

### Requirement: Chat stream processing supports AI hooks
The `ChatApi.sendMessage` method SHALL optionally invoke an `AiStreamParser` to process each SSE chunk before displaying text, when AI hooks are enabled in configuration.

#### Scenario: AI hooks enabled
- **WHEN** `ChatApi` is configured with `aiHooksEnabled: true`
- **AND** an SSE chunk arrives containing emotion markers
- **THEN** the parsed text (with markers removed) is displayed to the user
- **AND** extracted commands are dispatched to the `AiCommandBus`

#### Scenario: AI hooks disabled (backward compatibility)
- **WHEN** `ChatApi` is configured with `aiHooksEnabled: false` (default)
- **AND** an SSE chunk arrives
- **THEN** the raw text is displayed without parsing
