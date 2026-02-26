import { consume } from "@lit/context";
import { createComponent } from "@lit/react";
import { type PropertyValues, type TemplateResult, html } from "lit";
import { property, query, state } from "lit/decorators.js";
import React from "react";
import { UnoLitElement } from "@/live2d/common/UnoLitElement";
import {
	type Live2dConfig,
	configContext,
} from "@/live2d/context/config-context";
import { BeforeInitEvent } from "@/live2d/events/before-init.js";
import Model from "@/live2d/live2d/model";

export class Live2dCanvas extends UnoLitElement {
	@consume({ context: configContext })
	@property({ attribute: false })
	public config?: Live2dConfig;

	@state()
	private _model: unknown;

	@query("#live2d")
	private _live2d: HTMLCanvasElement;

	render(): TemplateResult {
		return html` <canvas id="live2d" class="cursor-grab"> </canvas> `;
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
