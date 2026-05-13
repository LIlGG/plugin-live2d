import type { Live2dConfig } from "@/live2d/context/config-context";
import { sendMessage } from "@/live2d/helpers/sendMessage";
import { isNotEmptyString } from "@/live2d/utils/isString";
import * as PIXI from "pixi.js";
import "@/live2d/libs/live2d.min.js";
import "@/live2d/libs/live2dcubismcore.min.js";
import { Live2DModel } from "untitled-pixi-live2d-engine";

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

const LIVE2D_CANVAS_SIZE = 300;
const LIVE2D_MODEL_PADDING = 1;
const LIVE2D_BOTTOM_OFFSET = 0.95;

class Model {
	#apiPath: string;
	#config: Live2dConfig;
	#live2dRootElement: HTMLCanvasElement;
	#app?: PIXI.Application;
	#appPromise: Promise<PIXI.Application>;
	#currentModel: Live2DModel | null = null;
	#loadSequence = 0;

	private constructor(root: HTMLCanvasElement, config: Live2dConfig) {
		const apiPath = config.apiPath;
		if (!isNotEmptyString(apiPath)) {
			throw new Error("Invalid initWidget argument!");
		}

		this.#apiPath = apiPath.endsWith("/") ? apiPath : `${apiPath}/`;
		this.#config = config;
		this.#live2dRootElement = root;
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
		let modelId = localStorage.getItem("modelId");
		let modelTexturesId = localStorage.getItem("modelTexturesId");
		if (modelId === null || !!this.#config.isForceUseDefaultConfig) {
			// 加载指定模型的指定材质
			modelId = String(this.#config.modelId || 1); // 模型 ID
			modelTexturesId = String(this.#config.modelTexturesId || 53); // 材质 ID
		}
		await this.loadModel(
			Number(modelId),
			Number(modelTexturesId),
			"Live2D 模型加载中...",
		);
	}

	private async replaceModel(nextModel: Live2DModel): Promise<void> {
		const app = await this.getApp();
		const modelWidth = nextModel.internalModel.width || nextModel.width;
		const modelHeight = nextModel.internalModel.height || nextModel.height;
		const scale = Math.min(
			app.screen.width / modelWidth,
			app.screen.height / modelHeight,
		);

		nextModel.anchor.set(0.5, 1);
		nextModel.scale.set(scale * LIVE2D_MODEL_PADDING);
		nextModel.position.set(
			app.screen.width / 2,
			app.screen.height * LIVE2D_BOTTOM_OFFSET,
		);

		if (this.#currentModel) {
			app.stage.removeChild(this.#currentModel);
			this.#currentModel.destroy();
		}

		app.stage.removeChildren();
		app.stage.addChild(nextModel);
		this.#currentModel = nextModel;
	}

	/**
	 * 为 Live2d 加载模型。
	 *
	 * @param modelId 模型编号
	 * @param modelTexturesId 纹理编号
	 * @param text 加载时的消息
	 */
	async loadModel(modelId: number, modelTexturesId: number, text?: string) {
		const app = await this.getApp();
		const loadSequence = ++this.#loadSequence;

		localStorage.setItem("modelId", String(modelId));
		localStorage.setItem("modelTexturesId", String(modelTexturesId));

		// 发送消息事件
		if (text) {
			sendMessage(text, 4000, 3);
		}
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
		const result = (await fetch(`${this.#apiPath}switch/?id=${modelId}`).then(
			(response) => response.json(),
		)) as ModelResult;
		await this.loadModel(result.model.id, 0, result.model.message);
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

	destroy(): void {
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
