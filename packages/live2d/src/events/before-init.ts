import { Live2dConfig } from "context/config-context";
import { Live2dEvent } from "./types";

export const BEFORE_INIT_EVENT_NAME = "live2d:before-init" as const;

declare global {
  interface GlobalEventHandlersEventMap {
    [BEFORE_INIT_EVENT_NAME]: BeforeInitEvent;
  }
}

export interface Live2dBeforeInitEventDetail {
  config?: Live2dConfig
}

/**
 * Live2d 初始化前事件
 */
export class BeforeInitEvent extends Live2dEvent<Live2dBeforeInitEventDetail> {
  constructor(detail: Live2dBeforeInitEventDetail) {
    super(BEFORE_INIT_EVENT_NAME, detail);
  }
}
