import { pickString } from "@/live2d/config/normalize-helpers";
import { defineCustomToolAction } from "@/live2d/live2d/tools/custom-tool-actions/types";
import { isNotEmptyString } from "@/live2d/utils/isString";

export default defineCustomToolAction({
  type: "open-url",
  normalize: (action) => {
    if (!isNotEmptyString(action.url)) {
      return;
    }

    return {
      type: "open-url",
      url: action.url,
      target: pickString(action.target) === "_self" ? "_self" : "_blank",
    };
  },
  execute: (_context, action) => {
    window.open(action.url, action.target ?? "_blank");
  },
});
