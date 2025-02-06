export interface Live2dConfig {
  // Live2d API 路径
  apiPath: string;
  // Live2d 定位
  live2dLocation: "left" | "right";
  // 是否在控制台显示状态
  consoleShowStatus?: boolean;
  // 是否显示右侧工具栏
  isTools?: boolean;
  [key: string]: unknown;
}

export interface Live2dMessageEventDetail {
  // 消息内容
  text: string;
  // 消息显示时间
  timeout: number;
  // 消息优先级
  priority: number;
}