import { consume } from "@lit/context";
import { createComponent } from "@lit/react";
import { type TemplateResult, html } from "lit";
import { property, state } from "lit/decorators.js";
import React from "react";
import { UnoLitElement } from "@/live2d/common/UnoLitElement";
import {
	type Live2dConfig,
	configContext,
} from "@/live2d/context/config-context";
import "@/live2d/components/Live2dToggle";
import "@/live2d/components/Live2dTips";
import "@/live2d/components/Live2dCanvas";
import "@/live2d/components/Live2dTools";
import "@/live2d/components/Live2dChatWindow";
import type { ToggleCanvasEvent } from "@/live2d/events/toggle-canvas";

export class Live2dWidget extends UnoLitElement {
	@consume({ context: configContext })
	@property({ attribute: false })
	public config?: Live2dConfig;

	@state()
	private _isShow = false;

	render(): TemplateResult {
		return html`
      <live2d-toggle
        @live2d:toggle-canvas=${this.handleToggleWidget}
      ></live2d-toggle>
      ${this.renderLive2dWidget()}
      ${this.renderChatWindow()}
    `;
	}

	renderLive2dTools() {
		if (this.config?.isTools) {
			return html`<live2d-tools
        class="absolute -right-5 bottom-0 opacity-0 transition-opacity-1000 group-hover:opacity-100"
      ></live2d-tools>`;
		}
	}

	renderLive2dWidget() {
		if (this._isShow) {
			return html`<div
        id="live2d-plugin"
        class="group inline-block translate-y-1 hover:translate-y-0 transition-transform-300"
      >
        <div class="flex flex-col items-center relative">
          <live2d-tips class="-mb-10"></live2d-tips>
          <live2d-canvas class="inline-block h-full"></live2d-canvas>
          ${this.renderLive2dTools()}
        </div>
      </div>`;
		}
	}

	handleToggleWidget = (e: ToggleCanvasEvent) => {
		this._isShow = e.detail.isShow;
		this.requestUpdate();
	};

	/**
	 * 渲染聊天窗口组件（如果启用了 AI 聊天功能）
	 */
	renderChatWindow() {
		// 检查是否启用了 AI 聊天
		if (this.config?.isAiChat) {
			return html`<live2d-chat-window></live2d-chat-window>`;
		}
	}

	connectedCallback(): void {
		super.connectedCallback();
		// 页面加载时清除历史消息
		// 对应原始代码中的 window.onload
		window.addEventListener("load", this.clearChatHistory);
		// 监听全局的 toggle-canvas 事件（来自工具或其他地方的触发）
		window.addEventListener(
			"live2d:toggle-canvas",
			this.handleToggleWidget as EventListener,
		);
	}

	disconnectedCallback(): void {
		super.disconnectedCallback();
		window.removeEventListener("load", this.clearChatHistory);
		window.removeEventListener(
			"live2d:toggle-canvas",
			this.handleToggleWidget as EventListener,
		);
	}

	/**
	 * 清除聊天历史记录
	 */
	private clearChatHistory(): void {
		localStorage.removeItem("historyMessages");
	}
}

customElements.define("live2d-widget", Live2dWidget);

export const Live2dWidgetComponent = createComponent({
	tagName: "live2d-widget",
	elementClass: Live2dWidget,
	react: React,
});
