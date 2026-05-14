import { ToggleChatWindowEvent } from "@/live2d/events/toggle-chat-window";
import { defineCustomToolAction } from "@/live2d/live2d/tools/custom-tool-actions/types";

export default defineCustomToolAction({
  type: "toggle-chat",
  normalize: () => ({ type: "toggle-chat" }),
  execute: () => {
    window.dispatchEvent(new ToggleChatWindowEvent());
  },
});
