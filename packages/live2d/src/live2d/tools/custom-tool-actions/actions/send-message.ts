import { pickNumber } from "@/live2d/config/normalize-helpers";
import { sendMessage } from "@/live2d/helpers/sendMessage";
import { defineCustomToolAction } from "@/live2d/live2d/tools/custom-tool-actions/types";
import { isNotEmptyString } from "@/live2d/utils/isString";

export default defineCustomToolAction({
  type: "send-message",
  normalize: (action) => {
    if (!isNotEmptyString(action.text)) {
      return;
    }

    return {
      type: "send-message",
      text: action.text,
      timeout: pickNumber(action.timeout),
      priority: pickNumber(action.priority),
    };
  },
  execute: (_context, action) => {
    sendMessage(action.text, action.timeout, action.priority);
  },
});
