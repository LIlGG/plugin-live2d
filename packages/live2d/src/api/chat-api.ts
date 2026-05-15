import { createStreamMessage } from "@/live2d/helpers/createStreamMessage";
import { sendMessage } from "@/live2d/helpers/sendMessage";

/**
 * 聊天消息角色
 */
export type ChatRole = "user" | "assistant";

/**
 * 聊天消息
 */
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

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
}

/**
 * 聊天响应结果
 */
export interface ChatResponse {
  text: string;
  status: number;
}

/**
 * 聊天 API 类
 */
export class ChatApi {
  private config: ChatApiConfig;
  private controller: AbortController | null = null;
  private requestTimeoutId: number | null = null;
  private messageTimer: number | null = null;

  constructor(config: ChatApiConfig = {}) {
    this.config = {
      apiEndpoint:
        config.apiEndpoint ||
        "/apis/api.live2d.halo.run/v1alpha1/live2d/ai/chat-process",
      chunkTimeout: config.chunkTimeout || 60,
      showChatMessageTimeout: config.showChatMessageTimeout || 10,
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
    // 添加用户消息到历史
    const userMessage: ChatMessage = {
      role: "user",
      content: message,
    };
    historyMessages.push(userMessage);

    // 创建 AbortController 用于取消请求
    this.controller = new AbortController();

    // 设置请求超时
    const timeoutMs = (this.config.chunkTimeout || 60) * 1000;
    this.requestTimeoutId = setTimeout(() => {
      this.abort();
    }, timeoutMs) as unknown as number;

    // 显示等待消息
    if (this.messageTimer) {
      clearTimeout(this.messageTimer);
      this.messageTimer = null;
    }
    this.messageTimer = setTimeout(() => {
      sendMessage("正在接收来自母星的消息，请耐心等待～", 2000, 2);
    }, 5000) as unknown as number;

    try {
      const apiEndpoint = this.config.apiEndpoint;
      if (!apiEndpoint) {
        throw new Error("API endpoint is not configured");
      }

      const response = await fetch(apiEndpoint, {
        method: "POST",
        cache: "no-cache",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          message: historyMessages,
        }),
        signal: this.controller.signal,
      });

      if (!response.ok) {
        this.handleErrorResponse(response);
        return;
      }

      // 处理流式响应
      await this.handleStreamResponse(response, historyMessages);
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
   * 处理错误响应
   */
  private handleErrorResponse(response: Response): void {
    if (response.status === 401) {
      sendMessage("请先登录！", 2000, 4);
    } else {
      sendMessage("对话接口异常了哦～快去联系我的主人吧！", 5000, 4);
    }
    console.error("[Chat API] Response error:", response);
    this.abort();
  }

  /**
   * 处理流式响应
   */
  private async handleStreamResponse(
    response: Response,
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

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const textDecoder = new TextDecoder();

    const chatMessage: ChatMessage = {
      role: "assistant",
      content: "",
    };

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        const text = textDecoder.decode(value);
        const textArrays = text.split("\n\n");

        for (let decoderText of textArrays) {
          if (!decoderText) continue;

          // 移除 "data:" 前缀
          if (decoderText.startsWith("data:")) {
            const dataIndex = decoderText.indexOf("data:");
            if (dataIndex !== -1) {
              decoderText = decoderText.substring(dataIndex + 5);
            }
          }

          try {
            const chatResult: ChatResponse = JSON.parse(decoderText);
            const { text, status } = chatResult;

            if (status === 200) {
              if (text === "[DONE]") {
                // 消息接收完成，保存到历史记录
                historyMessages.push(chatMessage);
                localStorage.setItem(
                  "historyMessages",
                  JSON.stringify(historyMessages),
                );
                chat.stop();
              } else {
                // 追加文本片段
                chatMessage.content += text;
                chat.sendMessage(text);
              }
            } else {
              throw new Error(text);
            }
          } catch (e) {
            console.error("[Chat API] Parse error:", decoderText, e);
            chat.sendMessage(`聊天接口出现异常了：${decoderText}`);
          }
        }
      }
    } catch (error) {
      console.error("[Chat API] Stream error:", error);
      throw error;
    }
  }

  /**
   * 中止当前请求
   */
  abort(): void {
    if (this.controller) {
      this.controller.abort();
    }
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
    this.controller = null;
  }

  /**
   * 检查是否正在加载
   */
  isLoading(): boolean {
    return this.controller !== null;
  }
}
