import { createComponent } from "@lit/react";
import { type TemplateResult, html } from "lit";
import { state } from "lit/decorators.js";
import React from "react";
import { UnoLitElement } from "@/live2d/common/UnoLitElement";
import { ToggleCanvasEvent } from "@/live2d/events/toggle-canvas";

export class Live2dToggle extends UnoLitElement {
	@state()
	// 当前工具栏是否显示
	private _isShow = false;

	connectedCallback(): void {
		super.connectedCallback();
		this.addEventListener("click", this.handleClick);
		window.addEventListener("live2d:toggle-canvas", this.handleGlobalToggle);

		Promise.resolve().then(() => {
			const live2dDisplay = localStorage.getItem("live2d-display");
			if (live2dDisplay) {
				if (
					Date.now() - Number.parseInt(live2dDisplay) <=
					24 * 60 * 60 * 1000
				) {
					this.triggerToggleLive2d(false);
					return;
				}
			}
			this.triggerToggleLive2d(true);
		});
	}

	disconnectedCallback(): void {
		super.disconnectedCallback();
		this.removeEventListener("click", this.handleClick);
		window.removeEventListener("live2d:toggle-canvas", this.handleGlobalToggle);
	}

	render(): TemplateResult {
		return html`<div
      class="fixed bottom-16 left-0 rounded-md bg-[#fa0] color-white cursor-pointer text-3 py-1.5 px-0.5 writing-vertical-rl -ml-1 w-9 hover:transform-translate-x-0 
      ${
				this._isShow
					? "-transform-translate-x-4"
					: "-transform-translate-x-full"
			} transition-transform duration-1000"
    >
      看板娘
    </div>`;
	}

	handleClick() {
		this.triggerToggleLive2d(!!this._isShow);
	}

	triggerToggleLive2d(isShow: boolean) {
		this._isShow = !isShow;
		if (isShow) {
			localStorage.removeItem("live2d-display");
		} else {
			localStorage.setItem("live2d-display", Date.now().toString());
		}
		this.dispatchEvent(
			new ToggleCanvasEvent({
				isShow,
			}),
		);
	}

	handleGlobalToggle = (e: Event) => {
		const event = e as ToggleCanvasEvent;
		this._isShow = !event.detail.isShow;
		if (event.detail.isShow) {
			localStorage.removeItem("live2d-display");
		} else {
			localStorage.setItem("live2d-display", Date.now().toString());
		}
	};
}

customElements.define("live2d-toggle", Live2dToggle);

export const Live2dToggleComponent = createComponent({
	tagName: "live2d-toggle",
	elementClass: Live2dToggle,
	react: React,
});
