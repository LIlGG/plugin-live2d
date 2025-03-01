import { html, type PropertyValues, type TemplateResult } from "lit";
import { UnoLitElement } from "../common/UnoLitElement";
import { createComponent } from "@lit/react";
import React from "react";
import { property, query, state } from "lit/decorators.js";
import Model from "../live2d/model";
import { consume } from "@lit/context";
import { configContext, type Live2dConfig } from "../context/config-context";
import { BeforeInitEvent } from "../events/before-init.js";

export class Live2dCanvas extends UnoLitElement {
  @consume({ context: configContext })
  @property({ attribute: false })
  public config?: Live2dConfig;

  @state()
  private _model: unknown;

  @query("#live2d")
  private _live2d;

  render(): TemplateResult {
    return html`
      <canvas
        id="live2d"
        width="800"
        height="800"
        class="h-75 w-75 cursor-grab"
      >
      </canvas>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    // 发出 Live2d beforeInit 事件
    window.dispatchEvent(new BeforeInitEvent({ config: this.config }));
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    if (this.config && this._live2d) {
      this._model = new Model(this._live2d, this.config);
    }
  }
}

customElements.define("live2d-canvas", Live2dCanvas);

export const Live2dCanvasComponent = createComponent({
  tagName: "live2d-canvas",
  elementClass: Live2dCanvas,
  react: React,
});
