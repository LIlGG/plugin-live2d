import { consume } from "@lit/context";
import { createComponent } from "@lit/react";
import { type PropertyValues, type TemplateResult, html } from "lit";
import { property, query, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import React from "react";
import { UnoLitElement } from "@/live2d/common/UnoLitElement";
import {
	type Live2dConfig,
	configContext,
} from "@/live2d/context/config-context";
import { ChatApi, type ChatMessage } from "@/live2d/api/chat-api";
import { sendMessage } from "@/live2d/helpers/sendMessage";
import "iconify-icon";

/**
 * Live2d 聊天窗口组件
 */
export class Live2dChatWindow extends UnoLitElement {
	@consume({ context: configContext })
	@property({ attribute: false })
	public config?: Live2dConfig;

	@state()
	private _isShow = false;

	@state()
	private _isLoading = false;

	@state()
	private _canSend = false;

	@query("#live2d-chat-input")
	private _input?: HTMLInputElement;

	private chatApi: ChatApi | null = null;
	private historyMessages: ChatMessage[] = [];

	connectedCallback(): void {
		super.connectedCallback();
		// 监听聊天窗口切换事件
		window.addEventListener("live2d:toggle-chat-window", this.handleToggle);
	}

	disconnectedCallback(): void {
		super.disconnectedCallback();
		window.removeEventListener("live2d:toggle-chat-window", this.handleToggle);
	}

	render(): TemplateResult {
		const containerClasses = {
			"opacity-100": this._isShow,
			"opacity-0": !this._isShow,
			"pointer-events-none": !this._isShow,
		};

		const sendButtonClasses = {
			active: this._canSend && !this._isLoading,
		};

		return html`
      <div
        id="live2d-chat-model"
        class="fixed inset-0 flex items-center justify-center z-9999 transition-opacity-300 ${classMap(
					containerClasses,
				)}"
      >
        <div
          class="live2d-chat-model-body bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md"
        >
          <div class="live2d-chat-content mb-4">
            <input
              id="live2d-chat-input"
              type="text"
              placeholder="请输入消息..."
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              @input=${this.handleInput}
              @keydown=${this.handleKeydown}
              ?disabled=${this._isLoading}
            />
          </div>
          <div class="flex justify-end">
            <span
              id="live2d-chat-send"
              class="inline-flex items-center justify-center w-10 h-10 rounded-full cursor-pointer transition-all ${classMap(
								sendButtonClasses,
							)} ${
								this._canSend && !this._isLoading
									? "bg-blue-500 hover:bg-blue-600"
									: "bg-gray-300 dark:bg-gray-600 cursor-not-allowed"
							}"
              @click=${this.handleSend}
            >
              ${
								this._isLoading
									? html`<iconify-icon
                    id="loadingIcon"
                    icon="line-md:loading-twotone-loop"
                    width="20"
                    height="20"
                    class="text-white"
                  ></iconify-icon>`
									: html`<iconify-icon
                    id="send"
                    icon="mingcute:send-plane-fill"
                    width="20"
                    height="20"
                    class="text-white"
                  ></iconify-icon>`
							}
            </span>
          </div>
        </div>
      </div>
    `;
	}

	/**
	 * 切换聊天窗口显示状态
	 */
	handleToggle = (): void => {
		this._isShow = !this._isShow;
		if (this._isShow) {
			this.updateComplete.then(() => {
				this._input?.focus();
			});
			return;
		}

		// 隐藏时清空输入
		if (this._input) {
			this._input.value = "";
			this._canSend = false;
		}
	};

	/**
	 * 处理输入变化
	 */
	handleInput(e: Event): void {
		const input = e.target as HTMLInputElement;
		this._canSend = input.value.length > 0 && !this._isLoading;
	}

	/**
	 * 处理键盘事件
	 */
	handleKeydown(e: KeyboardEvent): void {
		if (e.key === "Enter") {
			this.sendMessage();
		}
		if (e.key === "Escape") {
			this._isShow = false;
		}
	}

	/**
	 * 处理发送按钮点击
	 */
	handleSend(): void {
		if (this._canSend && !this._isLoading) {
			this.sendMessage();
		}
	}

	/**
	 * 发送消息
	 */
	private async sendMessage(): Promise<void> {
		if (!this._input || !this._input.value || this._isLoading) {
			return;
		}

		const message = this._input.value.trim();
		if (!message) {
			return;
		}

		// 清空输入框
		this._input.value = "";
		this._canSend = false;
		this._isLoading = true;

		// 初始化 ChatApi（如果还没有）
		if (!this.chatApi) {
			this.chatApi = new ChatApi({
				chunkTimeout: Number(this.config?.chunkTimeout || 60),
				showChatMessageTimeout: Number(
					this.config?.showChatMessageTimeout || 10,
				),
			});
		}

		// 加载历史消息
		const historyJson = localStorage.getItem("historyMessages");
		this.historyMessages = historyJson ? JSON.parse(historyJson) : [];

		try {
			await this.chatApi.sendMessage(message, this.historyMessages);
		} catch (error) {
			console.error("[Live2dChatWindow] Send message error:", error);
		} finally {
			this._isLoading = false;
			// 重新检查输入框状态
			if (this._input) {
				this._canSend = this._input.value.length > 0;
			}
		}
	}

	/**
	 * 显示首次使用提示
	 */
	protected firstUpdated(_changedProperties: PropertyValues): void {
		super.firstUpdated(_changedProperties);
		// 监听输入框获得焦点事件
		this._input?.addEventListener("focus", () => {
			sendMessage("按下回车键可以快速发送消息哦", 2000, 1);
		});
	}
}

customElements.define("live2d-chat-window", Live2dChatWindow);

export const Live2dChatWindowComponent = createComponent({
	tagName: "live2d-chat-window",
	elementClass: Live2dChatWindow,
	react: React,
});
