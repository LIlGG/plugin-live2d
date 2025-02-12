/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CustomEvent) */
interface CustomEvent<T = any> extends Event {
  /**
   * Returns any custom data event was created with. Typically used for synthetic events.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/CustomEvent/detail)
   */
  readonly detail: T;
  /**
   * @deprecated
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/CustomEvent/initCustomEvent)
   */
  initCustomEvent(type: keyof GlobalEventHandlersEventMap, bubbles?: boolean, cancelable?: boolean, detail?: T): void;
}


// 扩展全局事件映射
interface GlobalEventHandlersEventMap {
  // Live2d beforeInit 事件
  "live2d:before-init": CustomEvent<Live2dBeforeInitEventDetail>;

  // 切换 canvas 显示状态事件
  "live2d:toggle-canvas": CustomEvent<Live2dToggleEventDetail>;

  // 发送 Live2D 消息事件
  "live2d:send-message": CustomEvent<Live2dMessageEventDetail>;

  // 添加默认消息事件
  "live2d:add-default-message": CustomEvent<Live2dAddDefaultMessageEventDetail>;
}

interface Live2dMessageEventDetail {
  // 消息内容
  text: string[] | string;
  // 消息显示时间
  timeout: number;
  // 消息优先级
  priority: number;
}

interface Live2dBeforeInitEventDetail {
  // Live2D 配置
  config: Live2dConfig
}

interface Live2dToggleEventDetail {
  // 是否显示看板娘
  isShow: boolean;
}

interface Live2dAddDefaultMessageEventDetail {
  // 默认消息
  message: string[] | string;
}
