import { Live2dEvent } from "@/live2d/events/types";

export const TOGGLE_CHAT_WINDOW_EVENT_NAME =
  "live2d:toggle-chat-window" as const;

export interface ToggleChatWindowEventDetail {
  open?: boolean;
  focus?: boolean;
}

declare global {
  interface GlobalEventHandlersEventMap {
    [TOGGLE_CHAT_WINDOW_EVENT_NAME]: ToggleChatWindowEvent;
  }
}

/**
 * 切换或设置聊天窗口显示状态。
 * 不传 open 时保持原有切换语义。
 */
export class ToggleChatWindowEvent extends Live2dEvent<ToggleChatWindowEventDetail> {
  constructor(detail: ToggleChatWindowEventDetail = {}) {
    super(TOGGLE_CHAT_WINDOW_EVENT_NAME, detail);
  }
}
