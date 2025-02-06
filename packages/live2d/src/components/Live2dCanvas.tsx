import { html, type TemplateResult } from "lit";
import { UnoLitElement } from "../common/UnoLitElement";
import { createComponent } from "@lit/react";
import React from "react";
import { property, state } from "lit/decorators.js";
import Model from "../live2d/model";
import { consume } from "@lit/context";
import { configContext, type Live2dConfig } from "../context/config-context";

export class Live2dCanvas extends UnoLitElement {
	@consume({ context: configContext })
	@property({ attribute: false })
	public config?: Live2dConfig;

	@state()
	private _model: unknown;

	connectedCallback(): void {
		super.connectedCallback();
		this._model = new Model(this.config);
	}

	render(): TemplateResult {
		return html`
    <div id="live2d" width="800" height="800">
      
    </div>
    `;
	}
}

customElements.define("live2d-canvas", Live2dCanvas);

export const Live2dCanvasComponent = createComponent({
	tagName: "live2d-canvas",
	elementClass: Live2dCanvas,
	react: React,
});
