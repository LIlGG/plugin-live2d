import "@/libs/live2d.min.js";
import type { ModelReturn } from "./type";

declare function loadlive2d(domId: string, apiPath: string, poi: any): any;

export const useLive2dModel = (apiPath: string, log: boolean = false): ModelReturn => {
  const loadModel = (modelId: number, modelTexturesId: number) => {
    localStorage.setItem("modelId", modelId.toString());
    localStorage.setItem("modelTexturesId", modelTexturesId.toString());
    loadlive2d(
      "live2d",
      `${apiPath}get/?id=${modelId}-${modelTexturesId}`,
      log === true ? console.log(`[Status] Live2D 模型 ${modelId}-${modelTexturesId} 加载完成`) : null
    );
  };

  const loadModelTexture = (): Promise<string> => {
    const modelId = Number(localStorage.getItem("modelId"));
    const modelTexturesId = Number(localStorage.getItem("modelTexturesId"));
    return new Promise((resolve, reject) => {
      // 可选 "rand"(随机), "switch"(顺序)
      fetch(`${apiPath}rand_textures/?id=${modelId}-${modelTexturesId}`)
        .then((response) => response.json())
        .then((result) => {
          if (result["textures"]["id"] === 1 && (modelTexturesId === 1 || modelTexturesId === 0)) {
            resolve("我还没有其他衣服呢！");
          } else {
            loadModel(modelId, result["textures"]["id"]);
            resolve("我的新衣服好看嘛？");
          }
        })
        .catch((error) => {
          reject(error);
        });
    });
  };

  const switchModel = (): Promise<string> => {
    let modelId = Number(localStorage.getItem("modelId"));
    return new Promise((resolve, reject) => {
      fetch(`${apiPath}switch/?id=${modelId}`)
        .then((response) => response.json())
        .then((result) => {
          loadModel(result.model.id, 0);
          resolve(result.model.message);
        })
        .catch((error) => {
          reject(error);
        });
    });
  };

  return {
    loadModel,
    loadModelTexture,
    switchModel,
  };
};
