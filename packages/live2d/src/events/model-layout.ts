import { Live2dEvent } from "@/live2d/events/types";

export const MODEL_LAYOUT_EVENT_NAME = "live2d:model-layout" as const;

declare global {
  interface GlobalEventHandlersEventMap {
    [MODEL_LAYOUT_EVENT_NAME]: ModelLayoutEvent;
  }
}

export interface ModelLayoutEventDetail {
  topY: number;
  canvasHeight: number;
}

export class ModelLayoutEvent extends Live2dEvent<ModelLayoutEventDetail> {
  constructor(detail: ModelLayoutEventDetail) {
    super(MODEL_LAYOUT_EVENT_NAME, detail);
  }
}
