import { Live2dEvent } from "./types";

export const TOGGLE_CANVAS_EVENT_NAME = "live2d:toggle-canvas" as const;

declare global {
  interface GlobalEventHandlersEventMap {
    [TOGGLE_CANVAS_EVENT_NAME]: ToggleCanvasEvent;
  }
}

export interface Live2dToggleCanvasEventDetail {
  // 是否显示看板娘
  isShow: boolean;
}

/**
 * 切换 canvas 显示状态事件
 */
export class ToggleCanvasEvent extends Live2dEvent<Live2dToggleCanvasEventDetail> {
  constructor(detail: Live2dToggleCanvasEventDetail) {
    super(TOGGLE_CANVAS_EVENT_NAME, detail, {
      bubbles: true,
      composed: true,
    });
  }
}
