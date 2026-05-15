import { Live2dEvent } from "@/live2d/events/types";

export const TOGGLE_CHAT_WINDOW_EVENT_NAME =
  "live2d:toggle-chat-window" as const;

declare global {
  interface GlobalEventHandlersEventMap {
    [TOGGLE_CHAT_WINDOW_EVENT_NAME]: ToggleChatWindowEvent;
  }
}

/**
 * 切换聊天窗口事件
 * 不需要传递参数，每次触发都会切换显示状态
 */
export class ToggleChatWindowEvent extends Live2dEvent<Record<string, never>> {
  constructor() {
    super(TOGGLE_CHAT_WINDOW_EVENT_NAME, {});
  }
}
