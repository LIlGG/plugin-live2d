import { pickString } from "@/live2d/config/normalize-helpers";
import { defineCustomToolAction } from "@/live2d/live2d/tools/custom-tool-actions/types";

export default defineCustomToolAction({
  type: "screenshot",
  normalize: (action) => ({
    type: "screenshot",
    screenshotName: pickString(action.screenshotName),
  }),
  execute: ({ config, model }, action) => {
    if (!model) {
      return;
    }
    return model.capture(
      action.screenshotName ?? config.screenshotName ?? "live2d",
    );
  },
});
