import { Live2dEvent } from "./types";

export const ADD_DEFAULT_MESSAGE_EVENT_NAME = "live2d:add-default-message" as const;

declare global {
  interface GlobalEventHandlersEventMap {
    [ADD_DEFAULT_MESSAGE_EVENT_NAME]: AddDefaultMessageEvent;
  }
}

export interface Live2dAddDefaultMessageEventDetail {
  // 默认消息
  message: string[] | string;
}

/**
 * 添加默认消息事件
 */
export class AddDefaultMessageEvent extends Live2dEvent<Live2dAddDefaultMessageEventDetail> {
  constructor(detail: Live2dAddDefaultMessageEventDetail) {
    super(ADD_DEFAULT_MESSAGE_EVENT_NAME, detail);
  }
}