## Why

plugin-live2d 已具备 AI 流式聊天功能（SSE 后端 + 前端消息展示），但 Live2D 模型与 AI 输出之间是完全割裂的——模型不会根据 AI 的情感、说话节奏、内容产生任何反应。这使得「AI 看板娘」的体验停留在「文本聊天 + 静态立绘」的层面，无法发挥 Live2D 的动态表现力。建立 AI Runtime Hooks 层，让 LLM 输出直接驱动模型的表情、动作、渲染效果，是实现真正「AI 伴侣级」体验的关键一步。

## What Changes

- 在后端 AI Chat system prompt 中注入情感标记协议（`[happy]`, `[shy]`, `[surprised]` 等）
- 前端流式响应解析器：从 SSE chunk 中提取情感标记，转化为结构化 `AiCommand`
- AI Command Bus：统一分发情感、唇同步、动作、滤镜四类运行时指令
- 情感时间线系统（Emotion Timeline）：支持表情参数的平滑过渡而非瞬间切换
- 轻量级唇同步（Text-based Lip Sync）：基于文本节奏和标点推断口型变化
- 与 Motion Layer System 的集成点：AI 触发的高优先级动作层（gesture/override）
- 与 Runtime Filter Pipeline 的集成点：AI 情绪驱动渲染效果（色温、光晕）

## Capabilities

### New Capabilities
- `ai-stream-parser`: 前端 SSE 流式文本解析，提取情感标记和纯文本内容
- `ai-command-bus`: AI 指令总线，统一接收和分发运行时指令到各子系统
- `emotion-timeline`: 情感状态机与参数插值过渡系统
- `text-lip-sync`: 基于文本节奏的轻量级唇同步生成器

### Modified Capabilities
- `ai-chat`: 后端 ChatCompletion 接口的 system prompt 需增加情感标记输出规范

## Impact

- **后端**: `AiChatEndpoint.java` 的 system prompt 模板需要更新
- **前端 runtime**: 新增 `packages/live2d/src/runtime/ai/` 目录及模块
- **前端 chat**: `ChatApi` 的流式处理逻辑需接入 `AiStreamParser`
- **依赖**: 需要 Semantic Parameter Layer 和 Motion Layer System 作为前置基础设施（这两个系统属于独立的底层变更）
- **配置**: 新增 AI 联动相关的运行时配置项（情感标记开关、过渡时长等）
