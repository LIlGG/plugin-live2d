import { html, type TemplateResult } from "lit";
import { UnoLitElement } from "../common/UnoLitElement";
import { createComponent } from "@lit/react";
import React from "react";
import {
	LIVE2d_MESSAGE_EVENT,
	type Live2dMessageEventDetail,
} from "../events/types";
import { consume } from "@lit/context";
import { configContext, type Live2dConfig } from "../context/config-context";
import { property } from "lit/decorators.js";

export class Live2dTips extends UnoLitElement {
	@consume({ context: configContext })
	@property({ attribute: false })
	public config?: Live2dConfig;

	render(): TemplateResult {
		return html`
    <div id="live2d-tips">
      
    </div>
    `;
	}

	connectedCallback(): void {
		super.connectedCallback();
		// 为 tips 注册 tips 相关事件
		window.addEventListener(
			LIVE2d_MESSAGE_EVENT,
			this.handleMessage as EventListener,
		);
	}

	disconnectedCallback(): void {
		super.connectedCallback();
		window.removeEventListener(
			LIVE2d_MESSAGE_EVENT,
			this.handleMessage as EventListener,
		);
	}

	handleMessage(e: CustomEvent<Live2dMessageEventDetail>) {
		console.log(e.detail);
		return;
	}
}

customElements.define("live2d-tips", Live2dTips);

export const Live2dTipsComponent = createComponent({
	tagName: "live2d-tips",
	elementClass: Live2dTips,
	react: React,
});
