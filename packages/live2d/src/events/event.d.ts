// 扩展全局事件映射
interface GlobalEventHandlersEventMap {
  "live2d:before-init": CustomEvent<Live2dBeforeInitEventDetail>;

  "live2d:toggle-canvas": CustomEvent<Live2dToggleEventDetail>;

  "live2d:send-message": CustomEvent<Live2dMessageEventDetail>;
}