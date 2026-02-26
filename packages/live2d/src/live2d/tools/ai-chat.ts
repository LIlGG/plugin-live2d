import { isNotEmptyString } from "@/live2d/utils/isString";
import { Tool } from "@/live2d/live2d/tools/tools";

/**
 * AI 聊天工具
 */
export class AIChatTool extends Tool {
  priority = 100;

  icon() {
    const icon = this.getConfig().aiChatUrl;
    return isNotEmptyString(icon) ? icon : "ph-chats-circle-fill";
  }

  execute() {
    // TODO: 打开 AI 聊天
  }
}
