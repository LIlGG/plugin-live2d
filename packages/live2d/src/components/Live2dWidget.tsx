import { html, type TemplateResult } from "lit";
import { UnoLitElement } from "../common/UnoLitElement";
import { createComponent } from "@lit/react";
import React from "react";
import { state } from "lit/decorators.js";

import "./Live2dToggle";
import "./Live2dTips";
import "./Live2dCanvas";
import type { Live2dToggleEventDetail } from "../events/types";

export class Live2dWidget extends UnoLitElement {
	@state()
	private _isShow = false;

	render(): TemplateResult {
		return html`
    <live2d-toggle @live2d:toggle-canvas=${this.handleToggleWidget}></live2d-toggle>
    ${this.renderLive2dWidget()}
    `;
	}

	renderLive2dWidget() {
		if (this._isShow) {
			return html`<div id="live2d-plugin">
        <live2d-tips></live2d-tips>
        <live2d-canvas></live2d-canvas>
      </div>`;
		}
	}

	handleToggleWidget(e: CustomEvent<Live2dToggleEventDetail>) {
		this._isShow = e.detail.isShow;
	}
}

customElements.define("live2d-widget", Live2dWidget);

export const Live2dWidgetComponent = createComponent({
	tagName: "live2d-widget",
	elementClass: Live2dWidget,
	react: React,
});
