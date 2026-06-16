import type Model from "@/live2d/live2d/model";

let currentModel: Model | null = null;

export const setCurrentLive2dModel = (model: Model): void => {
  currentModel = model;
};

export const clearCurrentLive2dModel = (model?: Model | null): void => {
  if (!model || currentModel === model) {
    currentModel = null;
  }
};

export const getCurrentLive2dModel = (): Model | null => currentModel;
