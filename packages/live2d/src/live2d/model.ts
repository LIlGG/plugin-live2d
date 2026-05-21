import type { Live2dConfig } from "@/live2d/context/config-context";
import { ModelLayoutEvent } from "@/live2d/events/model-layout";
import { loadMergedTips } from "@/live2d/helpers/loadMergedTips";
import { sendMessage } from "@/live2d/helpers/sendMessage";
import { logConsoleStatus } from "@/live2d/live2d/console-status";
import { isNotEmptyString } from "@/live2d/utils/isString";
import * as PIXI from "pixi.js";
import "@/live2d/libs/live2d.min.js";
import "@/live2d/libs/live2dcubismcore.min.js";
import { Live2DModel } from "untitled-pixi-live2d-engine";
import { Live2dRuntimeController } from "@/live2d/runtime/controller";
import { SemanticParameterLayer } from "@/live2d/runtime/semantic";
import type { BehaviorFSM } from "@/live2d/runtime/behavior";
import type { EmotionTimeline } from "@/live2d/runtime/emotion";

declare global {
  interface Window {
    PIXI: typeof PIXI;
  }
}

window.PIXI = PIXI;

interface ModelTexturesResult {
  textures: {
    id: number;
  };
}

interface ModelResult {
  model: {
    id: number;
    message: string;
  };
}

interface EyeTrackingCleanup {
  _cleanupEyeTracking?: () => void;
}

const LIVE2D_CANVAS_SIZE = 300;
const LIVE2D_MODEL_PADDING = 1;
const LIVE2D_BOTTOM_OFFSET = 1;
const MESSAGE_TIMEOUT_MS = 4000;
const LOADING_MESSAGE_DELAY_MS = 1200;
const DEFAULT_LOADING_MESSAGE =
  "稍等一下下哦，人家正在梳理小裙摆，马上就来陪你啦～";
const HEAD_HIT_AREA_PATTERN = /(head|flickhead)/i;

const SPEECH_ANCHOR_MIN_RATIO = 0.04;
const SPEECH_ANCHOR_MAX_RATIO = 0.14;

interface LoadModelOptions {
  loadSequence?: number;
  showLoadingMessage?: boolean;
  loadingMessageDelayMs?: number;
  successMessage?: string | string[];
}

class Model {
  #apiPath: string;
  #config: Live2dConfig;
  #live2dRootElement: HTMLCanvasElement;
  #app?: PIXI.Application;
  #appPromise: Promise<PIXI.Application>;
  #currentModel: Live2DModel | null = null;
  #hasLoggedConsoleStatus = false;
  #loadSequence = 0;
  #controller: Live2dRuntimeController;

  private constructor(root: HTMLCanvasElement, config: Live2dConfig) {
    const apiPath = config.apiPath;
    if (!isNotEmptyString(apiPath)) {
      throw new Error("Invalid initWidget argument!");
    }

    this.#apiPath = apiPath.endsWith("/") ? apiPath : `${apiPath}/`;
    this.#config = config;
    this.#live2dRootElement = root;
    this.#controller = new Live2dRuntimeController({
      behaviorFSM: config.behaviorFSM,
      emotionTimeline: config.emotionTimeline,
      motionLayers: config.motionLayers,
      proceduralAnimation: config.proceduralAnimation,
      filterQuality: config.filterQuality,
    });
    this.#appPromise = this.initializeApplication();
  }

  static async create(
    root: HTMLCanvasElement,
    config: Live2dConfig,
  ): Promise<Model> {
    const model = new Model(root, config);
    await model._loadingModel();
    return model;
  }

  private async initializeApplication(): Promise<PIXI.Application> {
    const app = new PIXI.Application();
    await app.init({
      canvas: this.#live2dRootElement,
      autoStart: true,
      height: LIVE2D_CANVAS_SIZE,
      width: LIVE2D_CANVAS_SIZE,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
      backgroundColor: 0x00000000,
      backgroundAlpha: 0,
      preference: "webgl",
    });

    this.#app = app;
    return app;
  }

  private async getApp(): Promise<PIXI.Application> {
    if (this.#app) {
      return this.#app;
    }

    return this.#appPromise;
  }

  private async _loadingModel() {
    this.logConsoleStatusOnce();
    let modelId = localStorage.getItem("modelId");
    let modelTexturesId = localStorage.getItem("modelTexturesId");
    if (modelId === null || !!this.#config.isForceUseDefaultConfig) {
      // 加载指定模型的指定材质
      modelId = String(this.#config.modelId || 1); // 模型 ID
      modelTexturesId = String(this.#config.modelTexturesId || 53); // 材质 ID
    }
    await this.loadModel(Number(modelId), Number(modelTexturesId), undefined, {
      showLoadingMessage: true,
      loadingMessageDelayMs: LOADING_MESSAGE_DELAY_MS,
    });
  }

  private async getLoadingMessage(): Promise<string | string[]> {
    const tips = await loadMergedTips(this.#config);
    return tips.message.loading ?? DEFAULT_LOADING_MESSAGE;
  }

  private createLoadSequence(): number {
    return ++this.#loadSequence;
  }

  private scheduleLoadingMessage(
    loadSequence: number,
    delayMs: number,
  ): number {
    return window.setTimeout(() => {
      void this.showLoadingMessage(loadSequence);
    }, delayMs);
  }

  private async showLoadingMessage(loadSequence: number): Promise<void> {
    if (loadSequence !== this.#loadSequence) {
      return;
    }

    const loadingMessage = await this.getLoadingMessage();
    if (loadSequence !== this.#loadSequence) {
      return;
    }

    sendMessage(loadingMessage, MESSAGE_TIMEOUT_MS, 3);
  }

  private logConsoleStatusOnce(): void {
    if (!this.#config.consoleShowStatus || this.#hasLoggedConsoleStatus) {
      return;
    }

    logConsoleStatus();
    this.#hasLoggedConsoleStatus = true;
  }

  private async replaceModel(nextModel: Live2DModel): Promise<void> {
    const app = await this.getApp();
    const bounds = nextModel.getLocalBounds();
    const modelWidth =
      bounds.width || nextModel.internalModel.width || nextModel.width;
    const modelHeight =
      bounds.height || nextModel.internalModel.height || nextModel.height;
    const scale = Math.min(
      app.screen.width / modelWidth,
      app.screen.height / modelHeight,
    );

    nextModel.scale.set(scale * LIVE2D_MODEL_PADDING);
    nextModel.pivot.set(bounds.x + bounds.width / 2, bounds.y + bounds.height);
    nextModel.position.set(
      app.screen.width / 2,
      app.screen.height * LIVE2D_BOTTOM_OFFSET,
    );
    const modelTopY = this.getSpeechAnchorTopY(nextModel, bounds);
    window.dispatchEvent(
      new ModelLayoutEvent({
        topY: modelTopY,
        canvasHeight: app.screen.height,
      }),
    );

    if (this.#currentModel) {
      this.#controller.destroy(app.ticker);
      app.stage.removeChild(this.#currentModel);
      this.#currentModel.destroy();
    }

    app.stage.removeChildren();
    app.stage.addChild(nextModel);
    this.#currentModel = nextModel;

    // Stop any playing motions from the engine so our runtime takes over
    this.stopEngineMotions(nextModel);

    // Initialize controller with model
    this.#controller.initialize(nextModel, app.ticker);
  }

  private stopEngineMotions(model: Live2DModel): void {
    const internal = model.internalModel;
    if (!internal) return;

    // Stop primary motion manager
    if (typeof internal.motionManager?.stopAllMotions === "function") {
      internal.motionManager.stopAllMotions();
    }

    // Stop parallel motion managers (e.g., for Cubism 2.1 .mtn files)
    if (Array.isArray(internal.parallelMotionManager)) {
      for (const pm of internal.parallelMotionManager) {
        if (typeof pm?.stopAllMotions === "function") {
          pm.stopAllMotions();
        }
      }
    }
  }

  private getSpeechAnchorTopY(
    model: Live2DModel,
    bounds: { y: number; height: number },
  ): number {
    const anchorTop = this.getHeadTopY(model);
    const minAnchorTop = bounds.y + bounds.height * SPEECH_ANCHOR_MIN_RATIO;
    const maxAnchorTop = bounds.y + bounds.height * SPEECH_ANCHOR_MAX_RATIO;
    const preferredAnchorTop = anchorTop ?? bounds.y;
    const localTopY = Math.min(
      Math.max(preferredAnchorTop, minAnchorTop),
      maxAnchorTop,
    );
    return model.position.y + (localTopY - model.pivot.y) * model.scale.y;
  }

  private getHeadTopY(_model: Live2DModel): number | undefined {
    // Use semantic layer for hit area lookup when available
    const headIndex = this.#controller.getSemanticLayer().getHitAreaIndex(HEAD_HIT_AREA_PATTERN);
    if (headIndex === undefined) {
      return;
    }

    const headBounds = this.#controller.getSemanticLayer().getDrawableBounds(headIndex);
    if (!headBounds) {
      return;
    }

    return headBounds.y;
  }

  /**
   * 为 Live2d 加载模型。
   *
   * @param modelId 模型编号
   * @param modelTexturesId 纹理编号
   * @param text 加载时的消息
   */
  async loadModel(
    modelId: number,
    modelTexturesId: number,
    text?: string | string[],
    options: LoadModelOptions = {},
  ) {
    const app = await this.getApp();
    const loadSequence = options.loadSequence ?? this.createLoadSequence();
    if (options.loadSequence !== undefined) {
      if (loadSequence < this.#loadSequence) {
        return;
      }
      this.#loadSequence = loadSequence;
    }
    const loadingMessageTimer = options.showLoadingMessage
      ? this.scheduleLoadingMessage(
          loadSequence,
          options.loadingMessageDelayMs ?? LOADING_MESSAGE_DELAY_MS,
        )
      : undefined;

    localStorage.setItem("modelId", String(modelId));
    localStorage.setItem("modelTexturesId", String(modelTexturesId));

    // 发送消息事件
    if (text) {
      sendMessage(text, MESSAGE_TIMEOUT_MS, 3);
    }
    try {
      const model = await Live2DModel.from(
        `${this.#apiPath}get/?id=${modelId}-${modelTexturesId}`,
        {
          ticker: app.ticker,
          autoFocus: false,
          autoHitTest: false,
          autoInteract: false,
          onLoad: () => {
            if (this.#config.consoleShowStatus) {
              console.log(
                `[Status] Live2D 模型 ${modelId}-${modelTexturesId} 加载完成`,
              );
            }
          },
        },
      );

      if (loadSequence !== this.#loadSequence) {
        model.destroy();
        return;
      }

      await this.replaceModel(model);

      if (this.#config.consoleShowStatus) {
        const profile = this.#controller.getSemanticLayer().getCapabilityProfile();
        const detectedNames = Array.from(profile.detected.keys()).join(", ");
        const missingNames = profile.missing.join(", ");
        console.log(
          `[Status] Semantic parameters detected: ${profile.detected.size}, missing: ${profile.missing.length}`,
        );
        if (detectedNames) {
          console.log(`[Status] Detected: ${detectedNames}`);
        }
        if (missingNames) {
          console.log(`[Status] Missing: ${missingNames}`);
        }
      }

      this.setupEyeTrackingEvents();

      if (options.successMessage) {
        sendMessage(options.successMessage, MESSAGE_TIMEOUT_MS, 3);
      }
    } finally {
      if (loadingMessageTimer !== undefined) {
        clearTimeout(loadingMessageTimer);
      }
    }
  }

  /**
   * 随机切换模型贴图
   */
  async loadRandTextures() {
    const modelId = Number(localStorage.getItem("modelId"));
    const modelTexturesId = Number(localStorage.getItem("modelTexturesId"));
    // 可选 "rand"(随机), "switch"(顺序)
    const result = (await fetch(
      `${this.#apiPath}rand_textures/?id=${modelId}-${modelTexturesId}`,
    ).then((response) => response.json())) as ModelTexturesResult;
    const texturesId = result.textures.id;
    if (texturesId === 1 && (modelTexturesId === 1 || modelTexturesId === 0)) {
      sendMessage("我还没有其他衣服呢！", 4000, 3);
      return;
    }
    await this.loadModel(modelId, texturesId, "我的新衣服好看嘛？");
  }

  /**
   * 切换模型
   */
  async loadOtherModel() {
    const modelId = Number(localStorage.getItem("modelId"));
    const loadSequence = this.createLoadSequence();
    const loadingMessageTimer = this.scheduleLoadingMessage(
      loadSequence,
      LOADING_MESSAGE_DELAY_MS,
    );
    const result = (await fetch(`${this.#apiPath}switch/?id=${modelId}`).then(
      (response) => response.json(),
    )) as ModelResult;
    try {
      await this.loadModel(result.model.id, 0, undefined, {
        loadSequence,
        successMessage: result.model.message,
      });
    } finally {
      clearTimeout(loadingMessageTimer);
    }
  }

  /**
   * 截图
   * @param screenshotName 截图名称
   */
  async capture(screenshotName: string) {
    const app = await this.getApp();
    const canvas = app.renderer.extract.canvas(this.#currentModel ?? app.stage);
    const toBlob = canvas.toBlob?.bind(canvas);

    if (!toBlob) {
      throw new Error(
        "Canvas blob export is not supported in this environment.",
      );
    }

    await new Promise<void>((resolve, reject) => {
      toBlob((blob) => {
        if (!blob) {
          reject(new Error("Failed to capture Live2D screenshot."));
          return;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${screenshotName}.png`;
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
        resolve();
      });
    });
  }

  getController(): Live2dRuntimeController {
    return this.#controller;
  }

  getSemanticLayer(): SemanticParameterLayer {
    return this.#controller.getSemanticLayer();
  }

  getBehaviorFSM(): BehaviorFSM | undefined {
    return this.#controller.getBehaviorFSM();
  }

  getEmotionTimeline(): EmotionTimeline | undefined {
    return this.#controller.getEmotionTimeline();
  }

  private setupEyeTrackingEvents(): void {
    const eyeTracking = this.#controller.getProceduralSystem()?.getEyeTrackingModule();
    if (!eyeTracking) return;

    const canvas = this.#live2dRootElement;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      eyeTracking.updateCursorPosition(e.clientX, e.clientY, rect);
    };

    const handleMouseLeave = () => {
      eyeTracking.onCursorLeave();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        eyeTracking.updateCursorPosition(
          e.touches[0].clientX,
          e.touches[0].clientY,
          rect,
        );
      }
    };

    const handleTouchEnd = () => {
      eyeTracking.onCursorLeave();
    };

    // Bind to window so tracking works even when cursor is outside the canvas
    // (e.g. when Live2D is inside a shadow DOM container)
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);

    // Store cleanup function on the element for later removal
    (canvas as unknown as EyeTrackingCleanup)._cleanupEyeTracking = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }

  destroy(): void {
    // Cleanup eye tracking events
    const cleanup = (this.#live2dRootElement as unknown as EyeTrackingCleanup)
      ._cleanupEyeTracking;
    cleanup?.();

    this.#controller.destroy(this.#app?.ticker);

    if (this.#currentModel && this.#app) {
      this.#app.stage.removeChild(this.#currentModel);
      this.#currentModel.destroy();
      this.#currentModel = null;
    }

    this.#app?.destroy(false, {
      children: true,
      texture: true,
      textureSource: true,
      context: true,
    });
    this.#app = undefined;
  }
}

export default Model;
