import { ChatApi, type ChatMessage } from "@/live2d/api/chat-api";
import { UnoLitElement } from "@/live2d/common/UnoLitElement";
import {
  type Live2dConfig,
  configContext,
} from "@/live2d/context/config-context";
import { sendMessage } from "@/live2d/helpers/sendMessage";
import { consume } from "@lit/context";
import { createComponent } from "@lit/react";
import { type PropertyValues, type TemplateResult, html } from "lit";
import { property, query, state } from "lit/decorators.js";
import React from "react";
import "iconify-icon";

const CHAT_PANEL_WIDTH = "min(26rem, calc(100vw - 1rem))";
const CHAT_PANEL_BOTTOM = "2rem";
const CHAT_PANEL_TRANSITION_MS = 220;

type PopoverCapableElement = HTMLDivElement & {
  hidePopover: () => void;
  showPopover: () => void;
};

const isPopoverCapable = (
  element: HTMLDivElement | undefined,
): element is PopoverCapableElement =>
  !!element &&
  typeof (element as Partial<PopoverCapableElement>).showPopover ===
    "function" &&
  typeof (element as Partial<PopoverCapableElement>).hidePopover === "function";

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

  @query("#live2d-chat-model")
  private _panel?: HTMLDivElement;

  private chatApi: ChatApi | null = null;
  private historyMessages: ChatMessage[] = [];
  private _hidePopoverTimer?: number;

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("live2d:toggle-chat-window", this.handleToggle);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("live2d:toggle-chat-window", this.handleToggle);
    this.clearHidePopoverTimer();
  }

  render(): TemplateResult {
    const positionStyle = `inset: auto auto ${CHAT_PANEL_BOTTOM} 50%; margin: 0; width: ${CHAT_PANEL_WIDTH}; transform: translateX(-50%); transition: opacity ${CHAT_PANEL_TRANSITION_MS}ms ease;`;
    const panelClasses = [
      "fixed z-[10000] overflow-hidden rounded-full border border-[#eadfce] bg-[#fffaf4]/96 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm will-change-[opacity]",
      this._isShow
        ? "pointer-events-auto opacity-100"
        : "pointer-events-none opacity-0",
    ].join(" ");
    const sendButtonClass =
      this._canSend && !this._isLoading
        ? "bg-[#ffab5c] text-white shadow-[0_6px_16px_rgba(255,171,92,0.25)] hover:bg-[#ff9840]"
        : "bg-[#eee7de] text-slate-400 cursor-not-allowed";

    return html`
      <div
        id="live2d-chat-model"
        popover="manual"
        class=${panelClasses}
        style=${positionStyle}
      >
        <div class="flex items-center gap-1.5 px-1 py-1">
          <input
            id="live2d-chat-input"
            type="text"
            placeholder="和看板娘说点什么..."
            class="h-8.5 w-full appearance-none rounded-full border border-solid border-[#eadbc5] bg-white/98 px-3.5 py-0.5 text-3.25 text-slate-700 shadow-none outline-none transition-colors placeholder:text-slate-400 focus:border-[#ffbb72] focus:ring-1 focus:ring-[#ffd8ac] focus:shadow-none"
            @input=${this.handleInput}
            @keydown=${this.handleKeydown}
            ?disabled=${this._isLoading}
          />
          <button
            id="live2d-chat-send"
            type="button"
            class="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full border-none transition-colors ${sendButtonClass}"
            @click=${this.handleSend}
            aria-label=${this._isLoading ? "发送中" : "发送消息"}
          >
            ${
              this._isLoading
                ? html`<iconify-icon
                    id="loadingIcon"
                    icon="line-md:loading-twotone-loop"
                    width="18"
                    height="18"
                    class="text-current"
                  ></iconify-icon>`
                : html`<iconify-icon
                    id="send"
                    icon="mingcute:send-plane-fill"
                    width="18"
                    height="18"
                    class="text-current"
                  ></iconify-icon>`
            }
          </button>
          <button
            type="button"
            class="inline-flex h-7 w-7 flex-none items-center justify-center rounded-full border-none bg-transparent p-0 text-slate-400 transition-colors hover:bg-white/70 hover:text-slate-600"
            @click=${this.handleToggle}
            aria-label="关闭对话框"
          >
            <iconify-icon icon="ph:x-bold" width="12" height="12"></iconify-icon>
          </button>
        </div>
      </div>
    `;
  }

  handleToggle = (): void => {
    if (this._isShow) {
      this.hideChat();
      return;
    }

    void this.showChat();
  };

  handleInput = (e: Event): void => {
    const input = e.target as HTMLInputElement;
    this._canSend = input.value.length > 0 && !this._isLoading;
  };

  handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === "Enter") {
      e.preventDefault();
      void this.sendMessage();
    }
    if (e.key === "Escape") {
      this.handleToggle();
    }
  };

  handleSend = (): void => {
    if (this._canSend && !this._isLoading) {
      void this.sendMessage();
    }
  };

  private async sendMessage(): Promise<void> {
    if (!this._input || !this._input.value || this._isLoading) {
      return;
    }

    const message = this._input.value.trim();
    if (!message) {
      return;
    }

    this._input.value = "";
    this._canSend = false;
    this._isLoading = true;

    if (!this.chatApi) {
      this.chatApi = new ChatApi({
        chunkTimeout: Number(this.config?.chunkTimeout || 60),
        showChatMessageTimeout: Number(
          this.config?.showChatMessageTimeout || 10,
        ),
      });
    }

    const historyJson = localStorage.getItem("historyMessages");
    this.historyMessages = historyJson ? JSON.parse(historyJson) : [];

    try {
      await this.chatApi.sendMessage(message, this.historyMessages);
    } catch (error) {
      console.error("[Live2dChatWindow] Send message error:", error);
    } finally {
      this._isLoading = false;
      if (this._input) {
        this._canSend = this._input.value.length > 0;
      }
    }
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    this._input?.addEventListener("focus", () => {
      sendMessage("按下回车键可以快速发送消息哦", 2000, 1);
    });
  }

  private async showChat(): Promise<void> {
    this.clearHidePopoverTimer();
    await this.updateComplete;
    if (
      isPopoverCapable(this._panel) &&
      !this._panel.matches(":popover-open")
    ) {
      this._panel.showPopover();
    }

    requestAnimationFrame(() => {
      this._isShow = true;
      void this.updateComplete.then(() => {
        this._input?.focus();
      });
    });
  }

  private hideChat(): void {
    this.clearHidePopoverTimer();
    this._isShow = false;

    if (this._input) {
      this._input.value = "";
      this._input.blur();
      this._canSend = false;
    }

    if (
      !isPopoverCapable(this._panel) ||
      !this._panel.matches(":popover-open")
    ) {
      return;
    }

    this._hidePopoverTimer = window.setTimeout(() => {
      this._hidePopoverTimer = undefined;
      if (
        !this._isShow &&
        isPopoverCapable(this._panel) &&
        this._panel.matches(":popover-open")
      ) {
        this._panel.hidePopover();
      }
    }, CHAT_PANEL_TRANSITION_MS);
  }

  private clearHidePopoverTimer(): void {
    if (this._hidePopoverTimer !== undefined) {
      window.clearTimeout(this._hidePopoverTimer);
      this._hidePopoverTimer = undefined;
    }
  }
}

customElements.define("live2d-chat-window", Live2dChatWindow);

export const Live2dChatWindowComponent = createComponent({
  tagName: "live2d-chat-window",
  elementClass: Live2dChatWindow,
  react: React,
});
