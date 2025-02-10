import { html, type TemplateResult } from "lit";
import { UnoLitElement } from "../common/UnoLitElement";
import { createComponent } from "@lit/react";
import React from "react";
import { type Live2dToggleEventDetail, TOGGLE_CANVAS_EVENT } from "../events/types";
import { state } from "lit/decorators.js";

export class Live2dToggle extends UnoLitElement {
	@state()
	// 当前工具栏是否显示
	private _isShow = false;

	connectedCallback(): void {
		super.connectedCallback();
		this.addEventListener("click", this.handleClick);

		// 初始化时，判断是否已经隐藏看板娘超过一天，如果是，则显示看板娘。否则，继续隐藏看板娘。
		const live2dDisplay = localStorage.getItem("live2d-display");
		if (live2dDisplay) {
			if (Date.now() - Number.parseInt(live2dDisplay) <= 24 * 60 * 60 * 1000) {
				this.triggerToggleLive2d(false);
				return;
			}
		}
		this.triggerToggleLive2d(true);
	}

	disconnectedCallback(): void {
		super.disconnectedCallback();
		this.removeEventListener("click", this.handleClick);
	}

	render(): TemplateResult {
		return html`<div class="fixed bottom-16 left-0 rounded-md bg-[#fa0] color-white cursor-pointer text-3 py-1.5 px-0.5 writing-vertical-rl -ml-1 w-9 hover:transform-translate-x-0 ${this._isShow ? "-transform-translate-x-4" : "-transform-translate-x-full"} transition-transform duration-1000">
        看板娘
      </div>`;
	}

	handleClick() {
		this.triggerToggleLive2d(!!this._isShow);
	}

	triggerToggleLive2d(isShow: boolean) {
		// 当前切换栏与 Live2d 的显示状态相反
		this._isShow = !isShow;
		if (isShow) {
			localStorage.removeItem("live2d-display");
		} else {
			localStorage.setItem("live2d-display", Date.now().toString());
		}
		this.dispatchEvent(
			new CustomEvent<Live2dToggleEventDetail>(TOGGLE_CANVAS_EVENT, {
				bubbles: true,
				composed: true,
				detail: {
					isShow,
				},
			}),
		);
	}
}

customElements.define("live2d-toggle", Live2dToggle);

export const Live2dToggleComponent = createComponent({
	tagName: "live2d-toggle",
	elementClass: Live2dToggle,
	react: React,
});
