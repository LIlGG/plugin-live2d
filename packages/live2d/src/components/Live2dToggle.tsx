import { UnoLitElement } from "@/live2d/common/UnoLitElement";
import {
  type Live2dConfig,
  configContext,
} from "@/live2d/context/config-context";
import { ToggleCanvasEvent } from "@/live2d/events/toggle-canvas";
import { WIDGET_DRAWER_DURATION_MS } from "@/live2d/helpers/widgetDrawer";
import {
  clearWidgetDismissal,
  readWidgetSuppression,
  rememberWidgetDismissal,
} from "@/live2d/helpers/widgetVisibility";
import { DraggableMixin } from "@/live2d/mixins/draggable";
import { consume } from "@lit/context";
import { type TemplateResult, html } from "lit";
import { property } from "lit/decorators.js";
import { state } from "lit/decorators.js";
import "iconify-icon";

const DraggableUnoLitElement = DraggableMixin(UnoLitElement, {
  storageKey: "toggle",
  targetSelector: "#live2d-toggle",
});

export class Live2dToggle extends DraggableUnoLitElement {
  @consume({ context: configContext })
  @property({ attribute: false })
  public config?: Live2dConfig;

  @state()
  // 当前工具栏是否显示
  private _isShow = false;

  private revealTimer?: number;

  connectedCallback(): void {
    super.connectedCallback();
    // 应用保存的位置
    this.applySavedPosition();
    this.addEventListener("click", this.handleClick);
    window.addEventListener("live2d:toggle-canvas", this.handleGlobalToggle);

    Promise.resolve().then(() => {
      if (readWidgetSuppression(localStorage)) {
        this._isShow = true;
        this.requestUpdate();
        return;
      }

      clearWidgetDismissal(localStorage);
      this.dispatchEvent(new ToggleCanvasEvent({ isShow: true }));
    });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.clearRevealTimer();
    this.removeEventListener("click", this.handleClick);
    window.removeEventListener("live2d:toggle-canvas", this.handleGlobalToggle);
  }

  render(): TemplateResult {
    const positionClass =
      this.config?.live2dLocation === "right" ? "right-4" : "left-4";
    const visibilityClass = this._isShow
      ? "pointer-events-auto opacity-100 scale-100"
      : "pointer-events-none opacity-0 scale-90";
    return html`<div
      id="live2d-toggle"
      class="fixed bottom-16 ${positionClass} z-9999 inline-flex cursor-grab select-none items-center gap-1.5 rounded-full border border-[#f3d7b8] bg-[#fffaf4]/96 px-2.5 py-1.5 text-3.25 color-[#8b5e34] shadow-[0_8px_22px_rgba(139,94,52,0.18)] backdrop-blur-sm transition-[opacity,transform,box-shadow] duration-300 hover:scale-105 hover:shadow-[0_10px_26px_rgba(139,94,52,0.24)] active:cursor-grabbing ${visibilityClass}"
      role="button"
      tabindex="0"
      aria-label="打开看板娘"
      @keydown=${this.handleKeydown}
    >
      <span
        class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#ffb86c] color-white shadow-[inset_0_-2px_0_rgba(139,94,52,0.14)]"
      >
        <iconify-icon icon="ph:cat" width="18" height="18"></iconify-icon>
      </span>
      <span class="whitespace-nowrap font-500 leading-none">看板娘</span>
    </div>`;
  }

  handleClick() {
    this.dispatchEvent(new ToggleCanvasEvent({ isShow: this._isShow }));
  }

  handleKeydown = (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") {
      return;
    }
    e.preventDefault();
    this.handleClick();
  };

  handleGlobalToggle = (e: Event) => {
    const event = e as ToggleCanvasEvent;
    if (event.detail.isShow) {
      this.clearRevealTimer();
      this._isShow = false;
      clearWidgetDismissal(localStorage);
      return;
    }

    rememberWidgetDismissal(localStorage);
    this.clearRevealTimer();
    this.revealTimer = window.setTimeout(() => {
      this.revealTimer = undefined;
      this._isShow = true;
      this.requestUpdate();
    }, WIDGET_DRAWER_DURATION_MS);
  };

  private clearRevealTimer(): void {
    if (this.revealTimer === undefined) {
      return;
    }

    clearTimeout(this.revealTimer);
    this.revealTimer = undefined;
  }
}

customElements.define("live2d-toggle", Live2dToggle);
