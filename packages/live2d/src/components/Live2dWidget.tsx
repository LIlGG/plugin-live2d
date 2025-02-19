import { html, type TemplateResult } from "lit";
import { UnoLitElement } from "../common/UnoLitElement";
import { createComponent } from "@lit/react";
import React from "react";
import { property, state } from "lit/decorators.js";
import { consume } from "@lit/context";
import { configContext, type Live2dConfig } from "../context/config-context";
import "./Live2dToggle";
import "./Live2dTips";
import "./Live2dCanvas";
import "./Live2dTools";
import { ToggleCanvasEvent } from "../events/toggle-canvas";

export class Live2dWidget extends UnoLitElement {
	@consume({ context: configContext })
	@property({ attribute: false })
	public config?: Live2dConfig;

	@state()
	private _isShow = false;

	render(): TemplateResult {
		return html`
    <live2d-toggle @live2d:toggle-canvas=${this.handleToggleWidget}></live2d-toggle>
    ${this.renderLive2dWidget()}
    `;
	}

	renderLive2dTools() {
		if (this.config?.isTools) {
			return html`<live2d-tools class='absolute right-0'></live2d-tools>`;
		}
	}

	renderLive2dWidget() {
		if (this._isShow) {
			return html`<div id="live2d-plugin" class="inline-block">
        <div class="flex flex-col items-center relative">
          <live2d-tips class="-mb-10"></live2d-tips>
          <live2d-canvas class="inline-block h-full"></live2d-canvas>
          ${this.renderLive2dTools()}
        </div>
      </div>`;
		}
	}

	handleToggleWidget(e: ToggleCanvasEvent) {
    console.log(e);
		this._isShow = e.detail.isShow;
	}
}

customElements.define("live2d-widget", Live2dWidget);

export const Live2dWidgetComponent = createComponent({
	tagName: "live2d-widget",
	elementClass: Live2dWidget,
	react: React,
});
