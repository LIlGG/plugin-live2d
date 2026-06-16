import { rememberAgentAfterNavigationIntent } from "@/live2d/api/agent-navigation-intent";
import { AgentToolRuntime } from "@/live2d/api/agent-tool-runtime";
import type { AgentRuntimeConfig } from "@/live2d/config/agent-tools/agent-tool-config";
import { createStreamMessage } from "@/live2d/helpers/createStreamMessage";
import { sendMessage } from "@/live2d/helpers/sendMessage";
import {
  Chat,
  DefaultChatTransport,
  type ToolPart,
  type UIMessage,
  lastAssistantMessageHasCompletedToolContinuations,
  pruneMessages,
  validateUIMessages,
} from "@halo-dev/ai-foundation-sdk";

const DEFAULT_REASONING_MESSAGES = [
  "我正在认真想一想～",
  "让我整理一下思路，很快就好～",
  "稍等一下，我正在组织语言呢～",
];
const WAITING_MESSAGE = "正在接收来自母星的消息，请耐心等待～";

/**
 * 聊天消息角色
 */
/**
 * 聊天消息
 */
export type ChatMessage = UIMessage;

/**
 * 聊天 API 配置
 */
export interface ChatApiConfig {
  // API 端点
  apiEndpoint?: string;
  // 请求超时时间（秒）
  chunkTimeout?: number;
  // 消息显示时间（秒）
  showChatMessageTimeout?: number;
  // Agent 自动续写时，上一段助手消息最短可见时间（毫秒）
  autoContinuationMessageMinVisibleMs?: number;
  // 请求已收到时的即时提示语
  requestAcceptedMessage?: string;
  // 模型思考阶段的提示语
  reasoningMessages?: string[] | string | { message?: string }[];
  // 思考提示语轮换间隔（秒）
  reasoningMessageInterval?: number;
  // 保留上下文轮数
  chatContextRounds?: number;
  // Agent 能力运行时配置
  agent?: AgentRuntimeConfig;
}

/**
 * 聊天 API 类
 */
export class ChatApi {
  private config: ChatApiConfig;
  private chat: Chat | null = null;
  private agentRuntime: AgentToolRuntime;
  private requestTimeoutId: number | null = null;
  private messageTimer: number | null = null;

  constructor(config: ChatApiConfig = {}) {
    this.config = {
      apiEndpoint:
        config.apiEndpoint ||
        "/apis/api.live2d.halo.run/v1alpha1/live2d/ai/chat-process",
      chunkTimeout: config.chunkTimeout || 60,
      showChatMessageTimeout: config.showChatMessageTimeout || 10,
      autoContinuationMessageMinVisibleMs:
        this.normalizeAutoContinuationMessageMinVisibleMs(
          config.autoContinuationMessageMinVisibleMs,
        ),
      requestAcceptedMessage:
        config.requestAcceptedMessage || "收到啦，马上就来陪你啦～",
      reasoningMessages: this.normalizeReasoningMessages(
        config.reasoningMessages,
      ),
      reasoningMessageInterval: this.normalizeReasoningMessageInterval(
        config.reasoningMessageInterval,
      ),
      chatContextRounds: this.normalizeContextRounds(config.chatContextRounds),
      agent: config.agent,
    };
    this.agentRuntime = new AgentToolRuntime({
      config: this.config.agent,
    });
  }

  /**
   * 发送聊天消息
   * @param message 用户消息
   * @param historyMessages 历史消息列表
   * @returns Promise<void>
   */
  async sendMessage(
    message: string,
    historyMessages: ChatMessage[],
  ): Promise<void> {
    const trimmedHistory = this.trimHistory(
      this.normalizeHistory(historyMessages),
    );

    // 设置请求超时
    const timeoutMs = (this.config.chunkTimeout || 60) * 1000;
    this.requestTimeoutId = setTimeout(() => {
      this.abort();
    }, timeoutMs) as unknown as number;

    try {
      const apiEndpoint = this.config.apiEndpoint;
      if (!apiEndpoint) {
        throw new Error("API endpoint is not configured");
      }

      // 处理流式响应
      await this.handleStreamResponse(apiEndpoint, message, trimmedHistory);
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("[Chat API] Request failed:", error);
        sendMessage("对话接口异常了哦～快去联系我的主人吧！", 5000, 4);
      }
    } finally {
      this.cleanup();
    }
  }

  /**
   * 处理流式响应
   */
  private async handleStreamResponse(
    apiEndpoint: string,
    messageTextValue: string,
    historyMessages: ChatMessage[],
  ): Promise<void> {
    // 清除定时器
    if (this.messageTimer) {
      clearTimeout(this.messageTimer);
      this.messageTimer = null;
    }
    if (this.requestTimeoutId) {
      clearTimeout(this.requestTimeoutId);
      this.requestTimeoutId = null;
    }

    // 创建流式消息控制器
    const streamTimeout = (this.config.chunkTimeout || 60) * 1000;
    const showTimeout = (this.config.showChatMessageTimeout || 10) * 1000;
    const chat = createStreamMessage(streamTimeout, showTimeout);
    chat.setMessage(this.config.requestAcceptedMessage || "");

    let unsubscribe: (() => void) | undefined;
    let hasVisibleAssistantContent = false;
    let waitingMessageTimer: number | null = setTimeout(() => {
      if (!hasVisibleAssistantContent) {
        chat.setMessage(WAITING_MESSAGE);
      }
      waitingMessageTimer = null;
    }, 5000) as unknown as number;
    let reasoningMessageTimer: number | null = null;
    let reasoningMessageVisible = false;
    const stopWaitingMessage = () => {
      if (waitingMessageTimer) {
        clearTimeout(waitingMessageTimer);
        waitingMessageTimer = null;
      }
    };
    const stopReasoningMessages = () => {
      if (reasoningMessageTimer) {
        clearInterval(reasoningMessageTimer);
        reasoningMessageTimer = null;
      }
    };
    const showReasoningMessage = () => {
      const message = this.pickReasoningMessage();
      if (!message) {
        return;
      }
      stopWaitingMessage();
      hasVisibleAssistantContent = true;
      reasoningMessageVisible = true;
      chat.setMessage(message);
    };
    const startReasoningMessages = () => {
      if (reasoningMessageTimer) {
        return;
      }
      showReasoningMessage();
      reasoningMessageTimer = setInterval(
        showReasoningMessage,
        (this.config.reasoningMessageInterval || 5) * 1000,
      ) as unknown as number;
    };
    let streamedText = "";
    let displayedTextAnchor = "";
    let displayedTextBaseline = "";
    let lastVisibleAssistantText = "";
    let lastVisibleAssistantTextAt = 0;
    let automaticContinuationHoldUntil = 0;
    let deferredReplaceText: string | null = null;
    let deferredReplaceTimer: number | null = null;
    const markVisibleAssistantText = (text: string) => {
      lastVisibleAssistantText = text;
      lastVisibleAssistantTextAt = Date.now();
    };
    const clearDeferredReplaceTimer = () => {
      if (deferredReplaceTimer) {
        clearTimeout(deferredReplaceTimer);
        deferredReplaceTimer = null;
      }
    };
    const flushDeferredReplace = () => {
      if (deferredReplaceText === null) {
        return;
      }
      const text = deferredReplaceText;
      deferredReplaceText = null;
      clearDeferredReplaceTimer();
      stopWaitingMessage();
      stopReasoningMessages();
      hasVisibleAssistantContent = true;
      chat.setMessage(text);
      reasoningMessageVisible = false;
      streamedText = text;
      markVisibleAssistantText(text);
    };
    const scheduleDeferredReplace = (text: string) => {
      deferredReplaceText = text;
      const remaining = automaticContinuationHoldUntil - Date.now();
      if (remaining <= 0) {
        flushDeferredReplace();
        return false;
      }
      if (!deferredReplaceTimer) {
        deferredReplaceTimer = setTimeout(
          flushDeferredReplace,
          remaining,
        ) as unknown as number;
      }
      return true;
    };
    const shouldHoldAutomaticContinuationReplace = (
      willReplaceIncomingText: boolean,
    ) =>
      willReplaceIncomingText &&
      lastVisibleAssistantText.length > 0 &&
      automaticContinuationHoldUntil > Date.now();
    const shouldKeepVisibleAssistantTextDuringToolWait = () =>
      (this.config.autoContinuationMessageMinVisibleMs ?? 0) > 0 &&
      lastVisibleAssistantText.length > 0;
    const waitForDeferredReplace = async () => {
      if (deferredReplaceText === null) {
        return;
      }
      const remaining = automaticContinuationHoldUntil - Date.now();
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      flushDeferredReplace();
    };
    try {
      const pendingContinuations = new Set<Promise<void>>();
      const queuedToolCalls = new Map<string, ToolPart>();
      const submittedAutomaticContinuationKeys = new Set<string>();
      const trackContinuation = (continuation: Promise<void>) => {
        const tracked = continuation.finally(() =>
          pendingContinuations.delete(tracked),
        );
        pendingContinuations.add(tracked);
        return tracked;
      };
      const waitForContinuations = async () => {
        while (pendingContinuations.size > 0 || queuedToolCalls.size > 0) {
          flushQueuedToolCalls();
          if (pendingContinuations.size === 0) {
            break;
          }
          await Promise.allSettled([...pendingContinuations]);
        }
      };
      let sdkChat: Chat;
      const handledToolCalls = new Set<string>();
      const shouldQueueToolCall = () =>
        sdkChat.status === "submitted" || sdkChat.status === "streaming";
      const executeToolCall = (part: ToolPart) => {
        if (handledToolCalls.has(part.toolCallId)) {
          return;
        }
        if (shouldQueueToolCall()) {
          queuedToolCalls.set(part.toolCallId, part);
          return;
        }
        handledToolCalls.add(part.toolCallId);
        if (!this.agentRuntime.canExecute(part.toolName)) {
          return trackContinuation(
            sdkChat
              .addToolOutput({
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                state: "output-error",
                errorText: "当前页面没有启用这个浏览器能力",
              })
              .then(() => undefined),
          );
        }
        return trackContinuation(
          this.agentRuntime
            .execute(part)
            .then((output) => {
              if (this.shouldResumeAfterNavigation(output)) {
                rememberAgentAfterNavigationIntent({
                  resume: {
                    historyMessages: this.historyWithToolOutput(
                      sdkChat.messages,
                      part,
                      output,
                    ),
                  },
                });
              }
              return sdkChat
                .addToolOutput({
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  output,
                })
                .then(() => output);
            })
            .then((output) => {
              if (this.shouldResumeAfterNavigation(output)) {
                rememberAgentAfterNavigationIntent({
                  resume: {
                    historyMessages: this.stabilizeHistory(sdkChat.messages),
                  },
                });
              }
            })
            .then(() => undefined),
        );
      };
      const flushQueuedToolCalls = () => {
        if (shouldQueueToolCall() || queuedToolCalls.size === 0) {
          return;
        }
        const parts = [...queuedToolCalls.values()];
        queuedToolCalls.clear();
        for (const part of parts) {
          executeToolCall(part);
        }
      };
      sdkChat = new Chat({
        id: "live2d-chat",
        messages: historyMessages,
        transport: new DefaultChatTransport({
          api: apiEndpoint,
          prepareSendMessagesRequest: (request) => {
            const continuationKeys = this.automaticContinuationKeys(
              request.messages,
            );
            if (continuationKeys.length > 0) {
              for (const key of continuationKeys) {
                submittedAutomaticContinuationKeys.add(key);
              }
              const minVisibleMs =
                this.config.autoContinuationMessageMinVisibleMs ?? 0;
              if (
                minVisibleMs > 0 &&
                lastVisibleAssistantText.length > 0 &&
                lastVisibleAssistantTextAt > 0
              ) {
                automaticContinuationHoldUntil = Math.max(
                  automaticContinuationHoldUntil,
                  lastVisibleAssistantTextAt + minVisibleMs,
                );
              }
            }
            return {};
          },
        }),
        onError: (error) => {
          console.error("[Chat API] Stream error:", error);
        },
        onToolCall: (part) => {
          return executeToolCall(part);
        },
        sendAutomaticallyWhen: ({ messages }) => {
          const continuationKeys = this.automaticContinuationKeys(messages);
          const unsubmittedContinuationKeys = continuationKeys.filter(
            (key) => !submittedAutomaticContinuationKeys.has(key),
          );
          const shouldSend =
            this.shouldAutoSend(messages) &&
            unsubmittedContinuationKeys.length > 0;
          return shouldSend;
        },
        maxAutomaticSteps: 5,
        onAutomaticStepLimitExceeded: () => {
          sendMessage(
            "工具连续执行次数达到上限啦，请换个说法再试试～",
            5000,
            3,
          );
        },
        onFinish: ({ messages, isAbort, isError }) => {
          if (!isAbort && !isError) {
            localStorage.setItem(
              "historyMessages",
              JSON.stringify(this.stabilizeHistory(messages)),
            );
          }
        },
      });
      this.chat = sdkChat;
      const handledApprovals = new Set<string>();
      unsubscribe = sdkChat.subscribe(() => {
        const latest = sdkChat.messages[sdkChat.messages.length - 1];
        if (!latest || latest.role !== "assistant") {
          flushQueuedToolCalls();
          return;
        }
        this.agentRuntime.ingestMessages(sdkChat.messages);
        for (const part of latest.parts) {
          if (this.isToolPart(part) && part.state === "input-available") {
            executeToolCall(part);
          }
          if (
            !this.isToolPart(part) ||
            part.state !== "approval-requested" ||
            !part.approval?.id ||
            handledApprovals.has(part.approval.id)
          ) {
            continue;
          }
          handledApprovals.add(part.approval.id);
          trackContinuation(
            this.agentRuntime
              .requestApproval(`要我帮你执行「${part.toolName}」吗？`)
              .then((approved) => {
                return sdkChat.addToolApprovalResponse({
                  id: part.approval?.id,
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  approved,
                  reason: approved
                    ? "Approved by visitor"
                    : "Denied by visitor",
                });
              })
              .then(() => undefined),
          );
        }
        const textAnchor = this.displayTextAnchor(latest);
        const allText = this.messageText(latest);
        let shouldReplaceIncomingText = false;
        if (
          textAnchor !== displayedTextAnchor ||
          this.displayText(latest, displayedTextBaseline).length <
            streamedText.length
        ) {
          const hadDisplayedTextAnchor = displayedTextAnchor.length > 0;
          const previousDisplayedTextBaseline = displayedTextBaseline;
          displayedTextAnchor = textAnchor;
          displayedTextBaseline = this.displayTextBaseline(latest);
          streamedText = "";
          const text = this.displayText(latest, displayedTextBaseline);
          if (text.length === 0 && this.hasPendingOrCompletedTool(latest)) {
            if (!shouldKeepVisibleAssistantTextDuringToolWait()) {
              startReasoningMessages();
            }
          } else if (text.length === 0 && hadDisplayedTextAnchor) {
            if (!shouldKeepVisibleAssistantTextDuringToolWait()) {
              startReasoningMessages();
            }
          } else if (text.length > 0) {
            shouldReplaceIncomingText =
              hadDisplayedTextAnchor ||
              reasoningMessageVisible ||
              allText.startsWith(previousDisplayedTextBaseline);
          }
        }
        const text = this.displayText(latest, displayedTextBaseline);
        if (deferredReplaceText !== null) {
          scheduleDeferredReplace(text);
          flushQueuedToolCalls();
          return;
        }
        if (text.length > streamedText.length) {
          stopWaitingMessage();
          hasVisibleAssistantContent = true;
          stopReasoningMessages();
          const isFirstTextAfterTool =
            displayedTextBaseline.length > 0 &&
            streamedText.length === 0 &&
            lastVisibleAssistantText.length > 0;
          const willReplaceIncomingText =
            shouldReplaceIncomingText ||
            isFirstTextAfterTool ||
            (reasoningMessageVisible && streamedText.length === 0);
          if (willReplaceIncomingText) {
            if (
              shouldHoldAutomaticContinuationReplace(willReplaceIncomingText) &&
              scheduleDeferredReplace(text)
            ) {
              flushQueuedToolCalls();
              return;
            }
            chat.setMessage(text);
            reasoningMessageVisible = false;
            markVisibleAssistantText(text);
          } else {
            chat.sendMessage(text.slice(streamedText.length));
            markVisibleAssistantText(text);
          }
        } else if (text.length === 0 && this.hasReasoningContent(latest)) {
          startReasoningMessages();
        }
        streamedText = text;
        flushQueuedToolCalls();
      });
      await sdkChat.sendMessage({ text: messageTextValue });
      flushQueuedToolCalls();
      await waitForContinuations();
      await waitForDeferredReplace();
      if (sdkChat.error) {
        throw sdkChat.error;
      }
      chat.stop();
    } catch (error) {
      console.error("[Chat API] Stream error:", error);
      stopWaitingMessage();
      stopReasoningMessages();
      if ((error as Error).name !== "AbortError") {
        if (reasoningMessageVisible) {
          chat.setMessage("");
        }
        chat.sendMessage(this.resolveErrorMessage(error));
      }
      chat.stop();
    } finally {
      stopWaitingMessage();
      stopReasoningMessages();
      clearDeferredReplaceTimer();
      unsubscribe?.();
    }
  }

  /**
   * 中止当前请求
   */
  abort(): void {
    this.chat?.stop();
    this.cleanup();
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    if (this.messageTimer) {
      clearTimeout(this.messageTimer);
      this.messageTimer = null;
    }
    if (this.requestTimeoutId) {
      clearTimeout(this.requestTimeoutId);
      this.requestTimeoutId = null;
    }
    this.chat = null;
  }

  /**
   * 检查是否正在加载
   */
  isLoading(): boolean {
    return this.chat !== null;
  }

  private normalizeContextRounds(rounds: number | undefined): number {
    if (!Number.isFinite(rounds) || !rounds || rounds < 1) {
      return 20;
    }
    return Math.floor(rounds);
  }

  private trimHistory(historyMessages: ChatMessage[]): ChatMessage[] {
    const maxMessages = this.config.chatContextRounds
      ? this.config.chatContextRounds * 2
      : 40;
    return this.stabilizeHistory(historyMessages, maxMessages);
  }

  private normalizeReasoningMessages(messages: unknown): string[] {
    if (typeof messages === "string" && messages.trim()) {
      return [messages.trim()];
    }
    if (!Array.isArray(messages)) {
      return [...DEFAULT_REASONING_MESSAGES];
    }
    const normalized = messages
      .map((message) => {
        if (typeof message === "string" && message.trim()) {
          return message.trim();
        }
        if (
          typeof message === "object" &&
          message !== null &&
          "message" in message &&
          typeof message.message === "string" &&
          message.message.trim()
        ) {
          return message.message.trim();
        }
        return undefined;
      })
      .filter((message): message is string => message !== undefined);
    return normalized.length > 0 ? normalized : [...DEFAULT_REASONING_MESSAGES];
  }

  private normalizeReasoningMessageInterval(
    interval: number | undefined,
  ): number {
    if (!Number.isFinite(interval) || !interval || interval < 1) {
      return 5;
    }
    return Math.floor(interval);
  }

  private normalizeAutoContinuationMessageMinVisibleMs(
    minVisibleMs: number | undefined,
  ): number {
    if (!Number.isFinite(minVisibleMs) || !minVisibleMs || minVisibleMs < 0) {
      return 0;
    }
    return Math.floor(Math.min(minVisibleMs, 10_000));
  }

  private pickReasoningMessage(): string | undefined {
    const messages = this.config.reasoningMessages;
    if (!Array.isArray(messages) || messages.length === 0) {
      return;
    }
    const message = messages[Math.floor(Math.random() * messages.length)];
    if (typeof message === "string") {
      return message;
    }
    return message?.message;
  }

  private hasReasoningContent(message: UIMessage): boolean {
    return this.partsAfterLastTool(message).some(
      (part) => part.type === "reasoning" && part.text.trim().length > 0,
    );
  }

  private hasPendingOrCompletedTool(message: UIMessage): boolean {
    return message.parts.some((part) => this.isToolPart(part));
  }

  private messageText(message: UIMessage): string {
    return message.parts
      .filter(
        (part): part is Extract<typeof part, { type: "text" }> =>
          part.type === "text",
      )
      .map((part) => part.text)
      .join("");
  }

  private displayText(message: UIMessage, baseline = ""): string {
    const textAfterLastTool = this.partsAfterLastTool(message)
      .filter(
        (part): part is Extract<typeof part, { type: "text" }> =>
          part.type === "text",
      )
      .map((part) => part.text)
      .join("");
    if (textAfterLastTool.length > 0) {
      return textAfterLastTool;
    }
    const text = this.messageText(message);
    if (baseline.length > 0) {
      return text.startsWith(baseline) ? text.slice(baseline.length) : text;
    }
    return this.hasPendingOrCompletedTool(message) ? "" : text;
  }

  private displayTextBaseline(message: UIMessage): string {
    const lastToolIndex = this.lastToolPartIndex(message);
    if (lastToolIndex === -1) {
      return "";
    }
    return message.parts
      .slice(0, lastToolIndex)
      .filter(
        (part): part is Extract<typeof part, { type: "text" }> =>
          part.type === "text",
      )
      .map((part) => part.text)
      .join("");
  }

  private displayTextAnchor(message: UIMessage): string {
    const lastToolIndex = this.lastToolPartIndex(message);
    if (lastToolIndex === -1) {
      return `${message.id}:initial`;
    }
    const part = message.parts[lastToolIndex];
    if (!this.isToolPart(part)) {
      return `${message.id}:initial`;
    }
    return `${message.id}:${part.toolCallId}:${lastToolIndex}`;
  }

  private partsAfterLastTool(message: UIMessage): UIMessage["parts"] {
    const lastToolIndex = this.lastToolPartIndex(message);
    return lastToolIndex === -1
      ? message.parts
      : message.parts.slice(lastToolIndex + 1);
  }

  private lastToolPartIndex(message: UIMessage): number {
    for (let index = message.parts.length - 1; index >= 0; index -= 1) {
      if (this.isToolPart(message.parts[index])) {
        return index;
      }
    }
    return -1;
  }

  private normalizeHistory(messages: unknown): ChatMessage[] {
    if (!Array.isArray(messages)) {
      return [];
    }
    const normalizedMessages = this.stabilizeHistory(messages as ChatMessage[]);
    const issues = validateUIMessages(normalizedMessages);
    if (issues.length > 0) {
      console.warn("[Chat API] Ignore invalid UI message history:", issues);
      return [];
    }
    return normalizedMessages;
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }
    if (typeof error === "string" && error.trim()) {
      return error;
    }
    return "对话接口异常了哦～快去联系我的主人吧！";
  }

  private isToolPart(part: UIMessage["parts"][number]): part is ToolPart {
    return part.type.startsWith("tool-");
  }

  private shouldAutoSend(messages: UIMessage[]): boolean {
    return lastAssistantMessageHasCompletedToolContinuations({ messages });
  }

  private automaticContinuationKeys(messages: UIMessage[]): string[] {
    const assistant = [...messages]
      .reverse()
      .find((message) => message.role === "assistant");
    if (!assistant) {
      return [];
    }
    const keys = assistant.parts
      .filter((part): part is ToolPart => this.isToolPart(part))
      .filter((part) => this.isContinuableToolPart(part))
      .map((part) => this.automaticContinuationKey(part));
    return [...new Set(keys)];
  }

  private isContinuableToolPart(part: ToolPart): boolean {
    return (
      this.hasFinalToolResultState(part) || part.state === "approval-responded"
    );
  }

  private automaticContinuationKey(part: ToolPart): string {
    return JSON.stringify({
      toolCallId: part.toolCallId,
      toolName: part.toolName,
      state: part.state,
      approvalId: part.approval?.id,
      approved: part.approval?.approved,
    });
  }

  private hasFinalToolResultState(part: ToolPart): boolean {
    return (
      part.state === "output-available" ||
      part.state === "output-error" ||
      part.state === "output-denied"
    );
  }

  private shouldResumeAfterNavigation(output: unknown): boolean {
    if (typeof output !== "object" || output === null) {
      return false;
    }
    const record = output as Record<string, unknown>;
    if (record.navigating === true) {
      return record.pageReload !== false;
    }
    return this.shouldResumeAfterNavigation(record.output);
  }

  private historyWithToolOutput(
    messages: UIMessage[],
    part: ToolPart,
    output: unknown,
  ): ChatMessage[] {
    return this.stabilizeHistory(
      messages.map((message) => {
        if (message.role !== "assistant") {
          return message;
        }
        const parts = message.parts.map((messagePart) => {
          if (
            !this.isToolPart(messagePart) ||
            messagePart.toolCallId !== part.toolCallId
          ) {
            return messagePart;
          }
          return {
            ...messagePart,
            type: `tool-${part.toolName}`,
            toolName: part.toolName,
            toolCallId: part.toolCallId,
            state: "output-available",
            output,
          } satisfies ToolPart;
        });
        return { ...message, parts };
      }),
    );
  }

  private stabilizeHistory(
    messages: ChatMessage[],
    maxMessages?: number,
  ): ChatMessage[] {
    return this.sanitizeHistory(pruneMessages(messages, { maxMessages }));
  }

  private sanitizeHistory(messages: ChatMessage[]): ChatMessage[] {
    const seenFinalToolCallIds = new Set<string>();
    return [...messages]
      .reverse()
      .map((message) => {
        if (message.role !== "assistant") {
          return message;
        }
        const parts = [...message.parts]
          .reverse()
          .filter((part) => {
            if (!this.isToolPart(part)) {
              return true;
            }
            if (!this.hasFinalToolResultState(part)) {
              return true;
            }
            if (seenFinalToolCallIds.has(part.toolCallId)) {
              return false;
            }
            seenFinalToolCallIds.add(part.toolCallId);
            return true;
          })
          .reverse();
        return parts.length === message.parts.length
          ? message
          : { ...message, parts };
      })
      .reverse()
      .filter((message) => message.parts.length > 0);
  }
}
