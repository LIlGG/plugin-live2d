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

  render(): TemplateResult {
    return html`
      <canvas id="live2d" class="block h-full w-full cursor-grab"></canvas>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    window.dispatchEvent(new BeforeInitEvent({ config: this.config }));
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    clearCurrentLive2dModel(this.model);
    this.model?.destroy();
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
    if (!this.config || !this._live2d || this._modelInitialized) {
      return;
    }

    this._modelInitialized = true;

    try {
      const initialCanvasSize = this.canvasSize;
      this.model = await Model.create(
        this._live2d,
        this.config,
        initialCanvasSize,
      );
      if (initialCanvasSize !== this.canvasSize) {
        await this.model.resize(this.canvasSize);
      }
      setCurrentLive2dModel(this.model);
      window.dispatchEvent(new ModelReadyEvent({ model: this.model }));
    } catch (error) {
      this._modelInitialized = false;
      throw error;
    }
  }
}

customElements.define("live2d-canvas", Live2dCanvas);
