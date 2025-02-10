import type { Live2dConfig } from "../context/config-context";
import { sendMessage } from "../helpers/sendMessage";
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
  #live2dRootElement: HTMLElement;

  constructor(root: HTMLElement, config: Live2dConfig) {
    const apiPath = config.apiPath;
    if (!isNotEmptyString(apiPath)) {
      throw new Error("Invalid initWidget argument!");
    }

    this.#apiPath = apiPath.endsWith("/") ? apiPath : `${apiPath}/`;
    this.#config = config;
    this.#live2dRootElement = root;

    this._loadingModel();
  }

  private _loadingModel() {
    let modelId = localStorage.getItem("modelId");
    let modelTexturesId = localStorage.getItem("modelTexturesId");
    if (modelId === null || !!this.#config.isForceUseDefaultConfig) {
      // 加载指定模型的指定材质
      modelId = String(this.#config.modelId || 1); // 模型 ID
      modelTexturesId = String(this.#config.modelTexturesId || 53); // 材质 ID
    }
    this.loadModel(Number(modelId), Number(modelTexturesId), "Live2D 模型加载中...");
  }

  /**
   * 为 Live2d 加载模型。
   * 
   * @param modelId 模型编号
   * @param modelTexturesId 纹理编号
   * @param text 加载时的消息
   */
  async loadModel(modelId: number, modelTexturesId: number, text?: string) {
    localStorage.setItem("modelId", String(modelId));
    localStorage.setItem("modelTexturesId", String(modelTexturesId));
    // 发送消息事件
    if (text) {
      sendMessage(text, 4000, 3);
    }
    loadlive2d(
      this.#live2dRootElement,
      `${this.#apiPath}get/?id=${modelId}-${modelTexturesId}`,
      console.log(`[Status] Live2D 模型 ${modelId}-${modelTexturesId} 加载完成`)
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

export default Model;