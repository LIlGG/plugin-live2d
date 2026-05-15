import { Live2dEvent } from "@/live2d/events/types";

export const STREAM_MESSAGE_START_EVENT_NAME =
  "live2d:stream-message-start" as const;
export const STREAM_MESSAGE_EVENT_NAME = "live2d:stream-message" as const;
export const STREAM_MESSAGE_STOP_EVENT_NAME =
  "live2d:stream-message-stop" as const;

declare global {
  interface GlobalEventHandlersEventMap {
    [STREAM_MESSAGE_START_EVENT_NAME]: StreamMessageStartEvent;
    [STREAM_MESSAGE_EVENT_NAME]: StreamMessageEvent;
    [STREAM_MESSAGE_STOP_EVENT_NAME]: StreamMessageStopEvent;
  }
}

export interface StreamMessageStartEventDetail {
  // 等待消息流的最大时间
  timeout: number;
}

export interface StreamMessageEventDetail {
  // 流式消息文本片段
  text: string;
}

export interface StreamMessageStopEventDetail {
  // 停止后显示的时间
  showTimeout: number;
}

/**
 * 流式消息开始事件 - 初始化流式消息模式
 */
export class StreamMessageStartEvent extends Live2dEvent<StreamMessageStartEventDetail> {
  constructor(detail: StreamMessageStartEventDetail) {
    super(STREAM_MESSAGE_START_EVENT_NAME, detail);
  }
}

/**
 * 流式消息事件 - 用于追加文本到提示框
 */
export class StreamMessageEvent extends Live2dEvent<StreamMessageEventDetail> {
  constructor(detail: StreamMessageEventDetail) {
    super(STREAM_MESSAGE_EVENT_NAME, detail);
  }
}

/**
 * 流式消息停止事件 - 用于停止流式消息
 */
export class StreamMessageStopEvent extends Live2dEvent<StreamMessageStopEventDetail> {
  constructor(detail: StreamMessageStopEventDetail) {
    super(STREAM_MESSAGE_STOP_EVENT_NAME, detail);
  }
}
