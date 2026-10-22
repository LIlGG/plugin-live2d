import { UnoLitElement } from "@/live2d/common/UnoLitElement";
import {
  type Live2dConfig,
  configContext,
} from "@/live2d/context/config-context";
import { BeforeInitEvent } from "@/live2d/events/before-init.js";
import { ModelReadyEvent } from "@/live2d/events/model-ready";
import Model from "@/live2d/live2d/model";
import {
  clearCurrentLive2dModel,
  setCurrentLive2dModel,
} from "@/live2d/live2d/model-store";
import { DESKTOP_LIVE2D_CANVAS_SIZE } from "@/live2d/utils/responsive";
import { consume } from "@lit/context";
import { type PropertyValues, type TemplateResult, html } from "lit";
import { property, query, state } from "lit/decorators.js";
import { keyed } from "lit/directives/keyed.js";

export class Live2dCanvas extends UnoLitElement {
  @consume({ context: configContext })
  @property({ attribute: false })
  public config?: Live2dConfig;

  @state()
  private model: Model | null = null;

  @property({ type: Number })
  public canvasSize = DESKTOP_LIVE2D_CANVAS_SIZE;

  @query("#live2d")
  private _live2d!: HTMLCanvasElement;

  private _modelInitialized = false;

  @state()
  private _canvasGeneration = 0;

  render(): TemplateResult {
    return html`
      ${keyed(
        this._canvasGeneration,
        html`<canvas id="live2d" class="block h-full w-full cursor-grab"></canvas>`,
      )}
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    window.dispatchEvent(new BeforeInitEvent({ config: this.config }));
    if (this.hasUpdated) {
      void this.updateComplete.then(() => this.initializeModel());
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    // Reconnecting must not reuse a canvas still owned by an old renderer.
    this._canvasGeneration++;
    if (this.model) {
      clearCurrentLive2dModel(this.model);
      this.model.destroy();
    }
    this.model = null;
    this._modelInitialized = false;
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);

    if (this.config && this._live2d && !this._modelInitialized) {
      void this.initializeModel();
    }
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has("canvasSize") && this.model) {
      void this.model.resize(this.canvasSize);
    }
  }

  getModel(): Model | null {
    return this.model;
  }

  private async initializeModel(): Promise<void> {
    if (
      !this.isConnected ||
      !this.config ||
      !this._live2d ||
      this._modelInitialized
    ) {
      return;
    }

    this._modelInitialized = true;
    const canvasGeneration = this._canvasGeneration;
    let model: Model | undefined;

    try {
      let canvasSize = this.canvasSize;
      model = await Model.create(this._live2d, this.config, canvasSize);
      while (true) {
        if (!this.isConnected || canvasGeneration !== this._canvasGeneration) {
          model.destroy();
          return;
        }
        if (canvasSize === this.canvasSize) break;
        canvasSize = this.canvasSize;
        await model.resize(canvasSize);
      }
      this.model = model;
      setCurrentLive2dModel(model);
      window.dispatchEvent(new ModelReadyEvent({ model }));
    } catch (error) {
      model?.destroy();
      if (canvasGeneration !== this._canvasGeneration) {
        return;
      }
      this._modelInitialized = false;
      throw error;
    }
  }
}

customElements.define("live2d-canvas", Live2dCanvas);
