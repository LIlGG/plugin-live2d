import { LIVE2d_MESSAGE_EVENT } from "../events/types";

/**
 * 向 Live2D 发送消息事件
 * @param text 
 * @param timeout 
 * @param priority 
 */
export function sendMessage(text: string, timeout = 3000, priority = 0) {
  const event = new CustomEvent(LIVE2d_MESSAGE_EVENT, {
    detail: {
      text,
      timeout,
      priority,
    },
  });
  window.dispatchEvent(event);
}