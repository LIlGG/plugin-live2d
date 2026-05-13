import {
  StreamMessageEvent,
  StreamMessageStartEvent,
  StreamMessageStopEvent,
} from "@/live2d/events/stream-message";

/**
 * 创建一个流式消息控制器
 * 此消息框的优先级将大于所有其他消息框优先级，且不会被其他消息覆盖。
 *
 * @param timeout 等待消息流的最大时间，超过此时间将自动关闭流消息框（毫秒）
 * @param showTimeout 消息全部接受完之后，展示时长（毫秒）
 * @returns 包含 sendMessage 和 stop 方法的控制器对象
 */
export function createStreamMessage(
  timeout: number,
  showTimeout: number,
): StreamMessageController {
  // 发送开始流式消息的事件，通知 Live2dTips 组件进入流式模式
  window.dispatchEvent(new StreamMessageStartEvent({ timeout }));

  /**
   * 发送文本片段到流式消息框
   * @param text 要追加的文本
   */
  const sendMessage = (text: string) => {
    window.dispatchEvent(new StreamMessageEvent({ text }));
  };

  /**
   * 停止流式消息，并在指定时间后关闭消息框
   */
  const stop = () => {
    window.dispatchEvent(new StreamMessageStopEvent({ showTimeout }));
  };

  return {
    sendMessage,
    stop,
  };
}

export interface StreamMessageController {
  /**
   * 发送消息片段
   */
  sendMessage: (text: string) => void;
  /**
   * 停止流式消息
   */
  stop: () => void;
}
