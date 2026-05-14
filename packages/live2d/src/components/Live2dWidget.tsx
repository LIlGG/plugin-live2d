import { UnoLitElement } from "@/live2d/common/UnoLitElement";
import {
  type Live2dConfig,
  configContext,
} from "@/live2d/context/config-context";
import { consume } from "@lit/context";
import { type TemplateResult, html } from "lit";
import { property, state } from "lit/decorators.js";
import "@/live2d/components/Live2dToggle";
import "@/live2d/components/Live2dTips";
import "@/live2d/components/Live2dCanvas";
import "@/live2d/components/Live2dTools";
import "@/live2d/components/Live2dChatWindow";
import type { ToggleCanvasEvent } from "@/live2d/events/toggle-canvas";
import {
  WIDGET_DRAWER_DURATION_MS,
  WIDGET_DRAWER_HIDDEN_BOTTOM,
  WIDGET_DRAWER_VISIBLE_BOTTOM,
} from "@/live2d/helpers/widgetDrawer";

export class Live2dWidget extends UnoLitElement {
  @consume({ context: configContext })
  @property({ attribute: false })
  public config?: Live2dConfig;

  @state()
  private _isShow = false;

  @state()
  private _hasMountedWidget = false;

  private showAnimationFrameId?: number;

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
    if (!this._hasMountedWidget) {
      return;
    }

    const positionClass =
      this.config?.live2dLocation === "right"
        ? "right-[50px] left-auto"
        : "left-0";
    const visibilityClass = this._isShow
      ? "pointer-events-auto"
      : "pointer-events-none";
    const bottom = this._isShow
      ? WIDGET_DRAWER_VISIBLE_BOTTOM
      : WIDGET_DRAWER_HIDDEN_BOTTOM;
    return html`<div
        id="live2d-plugin"
        class="fixed z-9998 inline-block linear transition-[bottom] ${positionClass} ${visibilityClass}"
        style="bottom: ${bottom}; transition-duration: ${WIDGET_DRAWER_DURATION_MS}ms;"
      >
          <div
            class="group flex flex-col items-center relative translate-y-1 transition-transform duration-300 hover:translate-y-0"
          >
            <live2d-tips class="-mb-10"></live2d-tips>
            <live2d-canvas
              class="inline-block h-[300px] w-[300px] z-1"
            ></live2d-canvas>
            ${this.renderLive2dTools()}
          </div>
        </div>`;
  }

  handleToggleWidget = (e: ToggleCanvasEvent) => {
    if (e.detail.isShow && !this._hasMountedWidget) {
      this._hasMountedWidget = true;
      this.requestUpdate();
      this.scheduleShowAfterMount();
      return;
    }

    this.cancelScheduledShow();
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
    this.cancelScheduledShow();
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

  private scheduleShowAfterMount(): void {
    this.cancelScheduledShow();
    this.showAnimationFrameId = window.requestAnimationFrame(() => {
      this.showAnimationFrameId = undefined;
      this._isShow = true;
      this.requestUpdate();
    });
  }

  private cancelScheduledShow(): void {
    if (this.showAnimationFrameId === undefined) {
      return;
    }

    window.cancelAnimationFrame(this.showAnimationFrameId);
    this.showAnimationFrameId = undefined;
  }
}

customElements.define("live2d-widget", Live2dWidget);
