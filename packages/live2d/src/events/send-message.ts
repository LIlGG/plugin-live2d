import { Live2dEvent } from "./types";

export const SEND_MESSAGE_EVENT_NAME = "live2d:send-message" as const;

declare global {
  interface GlobalEventHandlersEventMap {
    [SEND_MESSAGE_EVENT_NAME]: SendMessageEvent;
  }
}

export interface Live2dMessageEventDetail {
  // 消息内容
  text: string[] | string;
  // 消息显示时间
  timeout: number;
  // 消息优先级
  priority: number;
}


/**
 * 发送消息事件
 */
export class SendMessageEvent extends Live2dEvent<Live2dMessageEventDetail> {
  constructor(detail: Live2dMessageEventDetail) {
    super(SEND_MESSAGE_EVENT_NAME, detail);
  }
}
