import { defineCustomToolAction } from "@/live2d/live2d/tools/custom-tool-actions/types";

export default defineCustomToolAction({
  type: "switch-model",
  normalize: () => ({ type: "switch-model" }),
  execute: ({ model }) => {
    if (!model) {
      return;
    }
    return model.loadOtherModel();
  },
});
