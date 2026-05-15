import { ToggleChatWindowEvent } from "@/live2d/events/toggle-chat-window";
import { Tool } from "@/live2d/live2d/tools/tools";
import { isNotEmptyString } from "@/live2d/utils/isString";

/**
 * AI 聊天工具
 */
export class AIChatTool extends Tool {
  priority = 100;

  name(): string {
    return "chat";
  }

  icon() {
    const icon = this.getConfig().openaiIcon;
    return isNotEmptyString(icon) ? icon : "ph-chats-circle-fill";
  }

  /**
   * 执行工具 - 切换聊天窗口显示状态
   */
  execute() {
    window.dispatchEvent(new ToggleChatWindowEvent());
  }
}
