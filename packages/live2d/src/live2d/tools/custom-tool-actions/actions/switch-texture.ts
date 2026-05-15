import { defineCustomToolAction } from "@/live2d/live2d/tools/custom-tool-actions/types";

export default defineCustomToolAction({
  type: "switch-texture",
  normalize: () => ({ type: "switch-texture" }),
  execute: ({ model }) => {
    if (!model) {
      return;
    }
    return model.loadRandTextures();
  },
});
