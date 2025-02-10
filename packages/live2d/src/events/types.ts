import type { Live2dConfig } from "../context/config-context";

// Live2d beforeInit 事件
export const LIVE2D_BEFORE_INIT_EVENT = 'live2d:before-init';
export type Live2dBeforeInitEventDetail = {
  // Live2D 配置
  config: Live2dConfig
}


// 切换 canvas 显示状态事件
export const TOGGLE_CANVAS_EVENT = 'live2d:toggle-canvas';
export type Live2dToggleEventDetail = {
  // 是否显示看板娘
  isShow: boolean;
}

// 发送 Live2D 消息事件
export const LIVE2d_MESSAGE_EVENT = 'live2d:send-message';
export type Live2dMessageEventDetail = {
  // 消息内容
  text: string;
  // 消息显示时间
  timeout: number;
  // 消息优先级
  priority: number;
}
