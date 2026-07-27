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
  WIDGET_DRAWER_VISIBLE_BOTTOM,
  getWidgetDrawerDuration,
} from "@/live2d/helpers/widgetDrawer";
import { DraggableMixin } from "@/live2d/mixins/draggable";
import {
  COMPACT_VIEWPORT_QUERY,
  getLive2dCanvasSize,
  getLive2dToolsLayoutClass,
  isCompactViewport,
} from "@/live2d/utils/responsive";

const DraggableUnoLitElement = DraggableMixin(UnoLitElement, {
  storageKey: "widget",
  targetSelector: "#live2d-plugin",
});

export class Live2dWidget extends DraggableUnoLitElement {
  @consume({ context: configContext })
  @property({ attribute: false })
  public config?: Live2dConfig;

  @state()
  private _isShow = false;

  @state()
  private _hasMountedWidget = false;

  @state()
  private _isDrawerAnimating = false;

  @state()
  private _isCompactViewport = false;

  private showAnimationFrameId?: number;
  private drawerAnimationTimer?: number;
  private compactViewportQuery?: MediaQueryList;

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
      const layoutClass = getLive2dToolsLayoutClass(
        this._isCompactViewport,
        this.config.live2dLocation,
      );
      return html`<live2d-tools
        class=${layoutClass}
        .compact=${this._isCompactViewport}
      ></live2d-tools>`;
    }
  }

  renderLive2dTips() {
    if (!this._isShow && !this._isDrawerAnimating) {
      return;
    }

    return html`<live2d-tips
      class="pointer-events-none absolute left-1/2 -translate-x-1/2"
      .compact=${this._isCompactViewport}
    ></live2d-tips>`;
  }

  renderLive2dWidget() {
    if (!this._hasMountedWidget) {
      return;
    }

    const positionClass = this.getPositionClass();
    const canvasSize = getLive2dCanvasSize(this._isCompactViewport);
    const drawerDuration = getWidgetDrawerDuration(this._isCompactViewport);
    const visibilityClass = this._isShow
      ? "pointer-events-auto"
      : "pointer-events-none";
    const shouldClipDrawer = !this._isShow || this._isDrawerAnimating;
    const drawerBoundaryStyle = shouldClipDrawer
      ? `bottom: ${WIDGET_DRAWER_VISIBLE_BOTTOM}; clip-path: inset(-100vh -100vw 0 -100vw);`
      : `bottom: ${WIDGET_DRAWER_VISIBLE_BOTTOM};`;
    const drawerClass = this._isShow ? "translate-y-0" : "translate-y-full";
    return html`<div
        id="live2d-plugin"
        class="fixed z-9998 inline-block ${positionClass} ${visibilityClass}"
        style=${drawerBoundaryStyle}
      >
          <div
            class="linear transition-transform ${drawerClass}"
            style="transition-duration: ${drawerDuration}ms;"
          >
            <div
              class="group flex items-end relative translate-y-1 transition-transform duration-300 hover:translate-y-0 ${
                this.config?.live2dLocation === "right"
                  ? "flex-row-reverse"
                  : ""
              }"
            >
              <div class="relative flex flex-col items-center">
                ${this.renderLive2dTips()}
                <live2d-canvas
                  class="inline-block z-1"
                  style="width: ${canvasSize}px; height: ${canvasSize}px;"
                  .canvasSize=${canvasSize}
                ></live2d-canvas>
              </div>
              ${this.renderLive2dTools()}
            </div>
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
    this.startDrawerAnimation();
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
    this.compactViewportQuery = window.matchMedia(COMPACT_VIEWPORT_QUERY);
    this._isCompactViewport = isCompactViewport();
    this.compactViewportQuery.addEventListener(
      "change",
      this.handleCompactViewportChange,
    );
    // 应用保存的位置
    this.applySavedPosition();
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
    this.compactViewportQuery?.removeEventListener(
      "change",
      this.handleCompactViewportChange,
    );
    this.compactViewportQuery = undefined;
    this.cancelScheduledShow();
    this.cancelDrawerAnimation();
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

  private readonly handleCompactViewportChange = (
    event: MediaQueryListEvent,
  ): void => {
    this._isCompactViewport = event.matches;
  };

  private getPositionClass(): string {
    if (this.config?.live2dLocation === "right") {
      return this._isCompactViewport
        ? "right-2 left-auto"
        : "right-[50px] left-auto";
    }
    return this._isCompactViewport ? "left-2" : "left-0";
  }

  private scheduleShowAfterMount(): void {
    this.cancelScheduledShow();
    this.showAnimationFrameId = window.requestAnimationFrame(() => {
      this.showAnimationFrameId = undefined;
      this.startDrawerAnimation();
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

  private startDrawerAnimation(): void {
    this.cancelDrawerAnimation();
    this._isDrawerAnimating = true;
    this.drawerAnimationTimer = window.setTimeout(() => {
      this.drawerAnimationTimer = undefined;
      this._isDrawerAnimating = false;
    }, getWidgetDrawerDuration(this._isCompactViewport));
  }

  private cancelDrawerAnimation(): void {
    if (this.drawerAnimationTimer === undefined) {
      return;
    }

    window.clearTimeout(this.drawerAnimationTimer);
    this.drawerAnimationTimer = undefined;
  }
}

customElements.define("live2d-widget", Live2dWidget);
