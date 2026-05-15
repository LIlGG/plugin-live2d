import { defineCustomToolAction } from "@/live2d/live2d/tools/custom-tool-actions/types";
import { isNotEmptyString } from "@/live2d/utils/isString";

const isNamespacedEventName = (value: string): boolean => value.includes(":");

const parseEventDetail = (detail: unknown): unknown => {
  if (typeof detail !== "string") {
    return detail;
  }

  const trimmed = detail.trim();
  if (!trimmed) {
    return detail;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return detail;
  }
};

export default defineCustomToolAction({
  type: "emit-event",
  normalize: (action) => {
    if (!isNotEmptyString(action.eventName)) {
      return;
    }

    return {
      type: "emit-event",
      eventName: action.eventName,
      detail: action.detail,
    };
  },
  execute: (_context, action) => {
    if (!isNamespacedEventName(action.eventName)) {
      return;
    }
    window.dispatchEvent(
      new CustomEvent(action.eventName, {
        detail: parseEventDetail(action.detail),
        bubbles: true,
        composed: true,
      }),
    );
  },
});
