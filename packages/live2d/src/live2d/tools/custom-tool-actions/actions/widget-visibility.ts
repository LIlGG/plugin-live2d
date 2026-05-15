import { ToggleCanvasEvent } from "@/live2d/events/toggle-canvas";
import { defineCustomToolAction } from "@/live2d/live2d/tools/custom-tool-actions/types";

type WidgetVisibilityMode = "show" | "hide" | "toggle";

const isWidgetVisibilityMode = (
  value: unknown,
): value is WidgetVisibilityMode =>
  value === "show" || value === "hide" || value === "toggle";

const readWidgetVisibility = (): boolean => {
  const widget = document
    .querySelector("live2d-widget")
    ?.shadowRoot?.getElementById("live2d-plugin");
  if (!widget) {
    return false;
  }
  return widget.classList.contains("pointer-events-auto");
};

const emitWidgetVisibility = (isShow: boolean): void => {
  window.dispatchEvent(new ToggleCanvasEvent({ isShow }));
};

export default defineCustomToolAction({
  type: "widget-visibility",
  normalize: (action) => {
    if (!isWidgetVisibilityMode(action.mode)) {
      return;
    }

    return {
      type: "widget-visibility",
      mode: action.mode,
    };
  },
  execute: (_context, action) => {
    if (action.mode === "toggle") {
      emitWidgetVisibility(!readWidgetVisibility());
      return;
    }
    emitWidgetVisibility(action.mode === "show");
  },
});
