import { SendMessageEvent } from "../events/send-message";

/**
 * 向 Live2D 发送消息事件
 * @param text
 * @param timeout
 * @param priority
 */
export function sendMessage(
  text: string | string[] | undefined,
  timeout = 3000,
  priority = 0
) {
  if (!text) {
    return;
  }
  window.dispatchEvent(new SendMessageEvent({ text, timeout, priority }));
}
