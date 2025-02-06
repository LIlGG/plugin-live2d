import { sendMessage } from "../helpers/sendMessage";
import type { Live2dConfig } from "../types";
import { isNotEmptyString } from "../util/isString";

declare const loadlive2d: any;

interface ModelTexturesResult {
  textures: {
    id: number;
  }
}

interface ModelResult {
  model: {
    id: number;
    message: string;
  }
}

class Model {
  #apiPath: string;
  #config: Live2dConfig;

  constructor(config: Live2dConfig) {
    const apiPath = config.apiPath;
    if (!isNotEmptyString(apiPath)) {
      throw new Error("Invalid initWidget argument!");
    }

    this.#apiPath = apiPath.endsWith("/") ? apiPath : `${apiPath}/`;
    this.#config = config;
  }

  /**
   * 为 Live2d 加载模型。
   * 
   * @param modelId 模型编号
   * @param modelTexturesId 纹理编号
   * @param text 加载时的消息
   */
  async loadModel(modelId: number, modelTexturesId: number, text: string) {
    localStorage.setItem("modelId", String(modelId));
    localStorage.setItem("modelTexturesId", String(modelTexturesId));
    // 发送消息事件
    sendMessage(text, 4000, 3);
    loadlive2d(
      "live2d",
      `${this.#apiPath}get/?id=${modelId}-${modelTexturesId}`,
      this.#config.consoleShowStatus === true
        ? console.log(`[Status] Live2D 模型 ${modelId}-${modelTexturesId} 加载完成`)
        : null
    );
  }

  /**
   * 随机切换模型贴图
   */
  async loadRandTextures() {
    const modelId = Number(localStorage.getItem("modelId"));
    const modelTexturesId = Number(localStorage.getItem("modelTexturesId"));
    // 可选 "rand"(随机), "switch"(顺序)
    const result = await fetch(`${this.#apiPath}rand_textures/?id=${modelId}-${modelTexturesId}`)
      .then((response) => response.json()) as ModelTexturesResult;
    const texturesId = result.textures.id;
    if (texturesId === 1 && (modelTexturesId === 1 || modelTexturesId === 0)) {
      sendMessage("我还没有其他衣服呢！", 4000, 3);
      return;
    }
    this.loadModel(modelId, texturesId, "我的新衣服好看嘛？");
  }

  /**
   * 切换模型
   */
  async loadOtherModel() {
    const modelId = Number(localStorage.getItem("modelId"));
    const result = await fetch(`${this.#apiPath}switch/?id=${modelId}`)
      .then((response) => response.json()) as ModelResult;
    this.loadModel(result.model.id, 0, result.model.message);
  }
}