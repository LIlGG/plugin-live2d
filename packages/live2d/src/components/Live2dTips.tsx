import { html, type TemplateResult } from "lit";
import { UnoLitElement } from "../common/UnoLitElement";
import { createComponent } from "@lit/react";
import React from "react";
import { consume } from "@lit/context";
import { configContext, type Live2dConfig } from "../context/config-context";
import { property, state } from "lit/decorators.js";
import { isNotEmpty } from "../utils/isNotEmpty";
import { randomSelection } from "../utils/randomSelection";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { classMap } from "lit/directives/class-map.js";
import { SendMessageEvent } from "../events/send-message";

export class Live2dTips extends UnoLitElement {
	@consume({ context: configContext })
	@property({ attribute: false })
	public config?: Live2dConfig;

	@state()
	private _isShow = false;
	@state()
	private _message = "";
	private priority = -1;
	private messageTimer: number | null = null;

	constructor() {
		super();
		this._isShow = false;
		this._message = "";
	}

	render(): TemplateResult {
		const classes = {
			"opacity-100": this._isShow,
			"opacity-0": !this._isShow,
		};
		return html`
    <div id="live2d-tips" class="animate-shake animate-delay-5s min-h-18 w-63 bg-tips border border-tips border-solid rounded-xl shadow-tips
    text-size-sm overflow-hidden px-2.5 py-1.5 text-ellipsis transition-opacity-1000 break-all ${classMap(classes)}">
      ${unsafeHTML(this._message)}
    </div>
    `;
	}
  
	connectedCallback(): void {
		super.connectedCallback();
		// 为 tips 注册 tips 相关事件
		window.addEventListener("live2d:send-message", this.handleMessage.bind(this));
	}

	disconnectedCallback(): void {
		super.disconnectedCallback();
		window.removeEventListener("live2d:send-message", this.handleMessage.bind(this));
	}

	handleMessage(e: SendMessageEvent): void {
		const { text, timeout, priority } = e.detail;
		if (!isNotEmpty(text)) {
			return;
		}
		if (priority < this.priority) {
			return;
		}
		if (this.messageTimer) {
			clearTimeout(this.messageTimer);
			this.messageTimer = null;
		}
		const message = randomSelection(text);
		if (!isNotEmpty(message)) {
			return;
		}
		this.priority = priority;
		this._message = message;
		this._isShow = true;
		this.messageTimer = setTimeout(() => {
			this._isShow = false;
			this.priority = -1;
		}, timeout);
	}
}

customElements.define("live2d-tips", Live2dTips);

export const Live2dTipsComponent = createComponent({
	tagName: "live2d-tips",
	elementClass: Live2dTips,
	react: React,
});
