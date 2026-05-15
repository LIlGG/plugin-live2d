import { pickNumber, pickString } from "@/live2d/config/normalize-helpers";
import { defineCustomToolAction } from "@/live2d/live2d/tools/custom-tool-actions/types";

export default defineCustomToolAction({
  type: "load-model",
  normalize: (action) => {
    const modelId = pickNumber(action.modelId);
    if (modelId === undefined) {
      return;
    }

    return {
      type: "load-model",
      modelId,
      modelTexturesId: pickNumber(action.modelTexturesId),
      message: pickString(action.message),
    };
  },
  execute: ({ model }, action) => {
    if (!model) {
      return;
    }
    return model.loadModel(
      action.modelId,
      action.modelTexturesId ?? 0,
      action.message,
    );
  },
});
