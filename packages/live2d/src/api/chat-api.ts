import { createStreamMessage } from "@/live2d/helpers/createStreamMessage";
import { sendMessage } from "@/live2d/helpers/sendMessage";
import {
  Chat,
  DefaultChatTransport,
  messageText,
  pruneMessages,
  type UIMessage,
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
  // 请求已收到时的即时提示语
  requestAcceptedMessage?: string;
  // 模型思考阶段的提示语
  reasoningMessages?: string[] | string | { message?: string }[];
  // 思考提示语轮换间隔（秒）
  reasoningMessageInterval?: number;
  // 保留上下文轮数
  chatContextRounds?: number;
}

/**
 * 聊天 API 类
 */
export class ChatApi {
  private config: ChatApiConfig;
  private chat: Chat | null = null;
  private requestTimeoutId: number | null = null;
  private messageTimer: number | null = null;

  constructor(config: ChatApiConfig = {}) {
    this.config = {
      apiEndpoint:
        config.apiEndpoint ||
        "/apis/api.live2d.halo.run/v1alpha1/live2d/ai/chat-process",
      chunkTimeout: config.chunkTimeout || 60,
      showChatMessageTimeout: config.showChatMessageTimeout || 10,
      requestAcceptedMessage:
        config.requestAcceptedMessage || "收到啦，马上就来陪你啦～",
      reasoningMessages: this.normalizeReasoningMessages(
        config.reasoningMessages,
      ),
      reasoningMessageInterval: this.normalizeReasoningMessageInterval(
        config.reasoningMessageInterval,
      ),
      chatContextRounds: this.normalizeContextRounds(config.chatContextRounds),
    };
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
    try {
      let streamedText = "";
      const sdkChat = new Chat({
        id: "live2d-chat",
        messages: historyMessages,
        transport: new DefaultChatTransport({
          api: apiEndpoint,
        }),
        onError: (error) => {
          console.error("[Chat API] Stream error:", error);
        },
        onFinish: ({ messages, isAbort, isError }) => {
          if (!isAbort && !isError) {
            localStorage.setItem("historyMessages", JSON.stringify(messages));
          }
        },
      });
      this.chat = sdkChat;
      unsubscribe = sdkChat.subscribe(() => {
        console.log("[Chat API] Stream messages:", sdkChat.messages);
        const latest = sdkChat.messages[sdkChat.messages.length - 1];
        if (!latest || latest.role !== "assistant") {
          return;
        }
        const text = messageText(latest);
        console.log("[Chat API] Stream text:", text);
        if (text.length > streamedText.length) {
          stopWaitingMessage();
          hasVisibleAssistantContent = true;
          stopReasoningMessages();
          if (reasoningMessageVisible && streamedText.length === 0) {
            chat.setMessage("");
            reasoningMessageVisible = false;
          }
          chat.sendMessage(text.slice(streamedText.length));
        } else if (text.length === 0 && this.hasReasoningContent(latest)) {
          startReasoningMessages();
        }
        streamedText = text;
      });
      await sdkChat.sendMessage({ text: messageTextValue });
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
    return pruneMessages(historyMessages, { maxMessages });
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

  private normalizeReasoningMessageInterval(interval: number | undefined): number {
    if (!Number.isFinite(interval) || !interval || interval < 1) {
      return 5;
    }
    return Math.floor(interval);
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
    return message.parts.some(
      (part) => part.type === "reasoning" && part.text.trim().length > 0,
    );
  }

  private normalizeHistory(messages: unknown): ChatMessage[] {
    if (!Array.isArray(messages)) {
      return [];
    }
    const issues = validateUIMessages(messages);
    if (issues.length > 0) {
      console.warn("[Chat API] Ignore invalid UI message history:", issues);
      return [];
    }
    return messages as ChatMessage[];
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
}
