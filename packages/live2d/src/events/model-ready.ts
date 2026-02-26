import { Live2dEvent } from "@/live2d/events/types";
import type Model from "@/live2d/live2d/model";

export const MODEL_READY_EVENT_NAME = "live2d:model-ready" as const;

declare global {
  interface GlobalEventHandlersEventMap {
    [MODEL_READY_EVENT_NAME]: ModelReadyEvent;
  }
}

export interface ModelReadyEventDetail {
  model: Model;
}

/**
 * Model 准备就绪事件
 */
export class ModelReadyEvent extends Live2dEvent<ModelReadyEventDetail> {
  constructor(detail: ModelReadyEventDetail) {
    super(MODEL_READY_EVENT_NAME, detail);
  }
}
