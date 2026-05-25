## Context

plugin-live2d 的前端已经通过 `untitled-pixi-live2d-engine` 实现了 PixiJS v8 驱动的 Live2D 渲染，支持 Cubism 2~5 全版本模型。AI 聊天功能也已接入：前端 `ChatApi` 通过 SSE 接收后端流式响应，后端 `AiChatEndpoint` 基于 OpenAI API 实现对话。但当前 AI 输出仅作为纯文本展示，Live2D 模型完全无法感知 AI 的情感状态、说话节奏或内容特征。

本设计建立在以下前置基础设施之上（由独立的底层变更提供）：
- **Semantic Parameter Layer**：统一参数语义 API，使 AI 无需关心底层参数名
- **Motion Layer System**：分层动画系统，支持 AI 触发的 gesture/override 层
- **Runtime Filter Pipeline**：PixiJS v8 滤镜管线，支持情绪驱动的渲染效果

## Goals / Non-Goals

**Goals：**
- 建立从 AI 流式输出到 Live2D 模型实时反应的完整数据管道
- 实现情感标记提取 → 参数过渡 → 唇同步 → 动作触发的端到端链路
- 保持与现有 AI 聊天功能的完全兼容（可开关）
- 延迟可控：情感反应 < 100ms，唇同步与文本展示同步

**Non-Goals：**
- 不实现基于真实音频分析的唇同步（如 VAD / TTS 音频流分析）——使用文本节奏推断作为轻量级替代
- 不修改 LLM 模型本身（仅通过 prompt engineering 影响输出格式）
- 不实现复杂的面部捕捉或摄像头输入
- 不替代现有的 motion 文件播放系统，仅作为运行时增强层

## Decisions

### 使用 prompt 内嵌标记协议而非独立情感分析请求

在 system prompt 中要求 LLM 输出情感标记（如 `[happy]`、`[shy]`），前端 StreamParser 实时提取。这比独立情感分析请求延迟更低（零额外网络请求），且完全受用户控制（system prompt 可自由调整）。

**替代方案**：前端接收完整回复后调用独立情感分类 API。延迟增加 100-300ms，但标记更精确。**选择 prompt 方案**是因为实时性对 Live2D 体验至关重要，且用户已确认可完全控制后端 prompt。

### 文本节奏唇同步而非音频分析唇同步

基于文本的字符流和标点推断口型节奏（短字符 = 开嘴，标点 = 闭嘴），而非等待 TTS 音频输出后做 FFT 分析。这避免了引入 TTS 依赖和音频处理复杂度。

**替代方案**：接入 Web Speech API 或 WASM 语音合成获取真实 phoneme 时序。**选择文本方案**是因为当前后端仅返回文本流，没有音频通道。文本方案可立即工作，未来可无缝升级到音频方案（相同 LipSyncFrame 接口）。

### 情感状态机采用离散情感 + 连续强度，而非多情感混合

每个时刻只有一个主导情感（如 `happy`），配合 0~1 的强度值。过渡到新情感时做参数插值。这比多情感向量混合更简单且效果足够好。

**替代方案**：Plutchik 情感轮的多维向量混合。**选择离散方案**是因为 Live2D 模型通常只有一组预定义的表情参数，多维混合需要更复杂的参数映射，收益有限。

### AiCommandBus 采用发布-订阅模式而非直接耦合

AI 解析器发布命令到总线，Semantic Layer / Motion Layer / Filter Pipeline 各自订阅感兴趣的命令类型。这避免了 AI 层与各运行时系统的循环依赖。

## Risks / Trade-offs

- **[Risk]** LLM 输出情感标记的位置可能与说话内容不同步（标记在句首但情感应覆盖整句）。→ **Mitigation**：标记生效时间从其出现位置开始，持续到下一个标记或句子结束。提供 `duration` 覆盖机制。
- **[Risk]** 低端设备上多层动画 + 滤镜可能影响帧率。→ **Mitigation**：所有 AI 联动效果提供 `quality` 配置（低/中/高），低端设备可降级到仅参数变化无滤镜。
- **[Risk]** 非标准 Live2D 模型缺少常见参数（如 `PARAM_ANGLE_X`），Semantic Layer 检测不到时表情不生效。→ **Mitigation**：Semantic Layer 的 `detectFromModel` 在初始化时报告 missing 参数，AI 层根据可用能力动态调整（Capability Detection 联动）。
- **[Risk]** 过于频繁的情感切换导致模型抖动。→ **Mitigation**：Emotion Timeline 的过渡时长最短限制为 300ms，同一句内的标记批量合并。

## Migration Plan

1. 后端更新 system prompt 模板（增加情感标记输出规范）
2. 前端新增 `runtime/ai/` 模块（独立目录，不影响现有代码）
3. `ChatApi` 增加可选的 `aiHooks` 回调配置（默认关闭，向后兼容）
4. 在 `Live2dCanvas` 中初始化 AI 联动层（仅在 `config.aiHooksEnabled` 为 true 时）
5. 通过 Halo 插件设置面板暴露 AI 联动开关和高级配置

Rollback：关闭 `aiHooksEnabled` 配置即可回退到纯文本聊天模式。

## Open Questions

- 情感标记集合的完整列表是否需要用户可配置？（建议先内置 6~8 种基础情感，后续再扩展）
- 是否需要支持每句话结束后的「返回 idle」行为？（建议默认启用，可配置 idle 延迟时长）
