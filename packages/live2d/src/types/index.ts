export interface Live2dToggleEventDetail {
  // 是否显示看板娘
  isShow: boolean;
}

export interface Live2dMessageEventDetail {
  // 消息内容
  text: string;
  // 消息显示时间
  timeout: number;
  // 消息优先级
  priority: number;
}