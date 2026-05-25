## 1. Backend Prompt Update

- [ ] 1.1 Update `AiChatEndpoint.java` system prompt template to include emotion marker instructions when AI hooks are enabled
- [ ] 1.2 Add `aiHooksEnabled` flag to backend AI chat configuration model
- [ ] 1.3 Ensure backward compatibility: prompt without markers when hooks disabled

## 2. Frontend AI Stream Parser

- [ ] 2.1 Create `packages/live2d/src/runtime/ai/AiStreamParser.ts` with emotion marker extraction
- [ ] 2.2 Implement configurable emotion vocabulary at parser initialization
- [ ] 2.3 Implement estimated timestamp calculation for extracted commands
- [ ] 2.4 Add unit tests for marker extraction edge cases (multiple markers, unknown markers, nested brackets)

## 3. AI Command Bus

- [ ] 3.1 Create `packages/live2d/src/runtime/ai/AiCommandBus.ts` with pub-sub interface
- [ ] 3.2 Define TypeScript types for all command types: `emotion`, `lipSync`, `motion`, `filter`
- [ ] 3.3 Implement command queuing for rapid successive publishes
- [ ] 3.4 Wire Command Bus into `ChatApi.handleStreamResponse` (behind `aiHooksEnabled` flag)

## 4. Emotion Timeline System

- [ ] 4.1 Create `packages/live2d/src/runtime/ai/EmotionTimeline.ts`
- [ ] 4.2 Implement discrete emotional state with intensity [0, 1]
- [ ] 4.3 Implement smooth parameter interpolation with configurable duration (min 300ms)
- [ ] 4.4 Create emotion-to-parameter mapping registry (happy, shy, sad, surprised, angry, thinking, neutral)
- [ ] 4.5 Implement auto-return to idle after configurable timeout
- [ ] 4.6 Integrate with Semantic Parameter Layer (via command bus subscription)

## 5. Text Lip Sync Generator

- [ ] 5.1 Create `packages/live2d/src/runtime/ai/TextLipSync.ts`
- [ ] 5.2 Implement text-to-mouth-shape heuristic mapping
- [ ] 5.3 Implement frame timing synchronized with SSE chunk arrival timing
- [ ] 5.4 Add graceful fallback when `mouthOpen` semantic parameter is unavailable
- [ ] 5.5 Integrate with Command Bus (publish `lipSync` commands)

## 6. Integration & Configuration

- [ ] 6.1 Add `aiHooksEnabled` and related fields to `Live2dConfig` interface
- [ ] 6.2 Initialize AI runtime layer in `Live2dCanvas` when config enables it
- [ ] 6.3 Ensure ChatApi backward compatibility (hooks disabled by default)
- [ ] 6.4 Add Halo plugin settings UI fields for AI hooks toggle and emotion timeout

## 7. Testing & Validation

- [ ] 7.1 End-to-end test: AI response with `[happy]` marker triggers model smile
- [ ] 7.2 End-to-end test: Rapid emotion changes do not cause visual jitter
- [ ] 7.3 Test backward compatibility: disabled hooks mode works identically to before
- [ ] 7.4 Performance test: AI hooks do not drop frame rate below 30fps on mid-tier devices
