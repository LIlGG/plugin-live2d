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
import { consume } from "@lit/context";
import { createComponent } from "@lit/react";
import { type TemplateResult, html } from "lit";
import { property } from "lit/decorators.js";
import { state } from "lit/decorators.js";
import React from "react";

export class Live2dToggle extends UnoLitElement {
  @consume({ context: configContext })
  @property({ attribute: false })
  public config?: Live2dConfig;

  @state()
  // 当前工具栏是否显示
  private _isShow = false;

  private revealTimer?: number;

  connectedCallback(): void {
    super.connectedCallback();
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
      this.config?.live2dLocation === "right" ? "right-0" : "left-0";
    return html`<div
      class="fixed bottom-16 ${positionClass} rounded-md bg-[#fa0] color-white cursor-pointer text-3 py-1.5 px-0.5 writing-vertical-rl ${
        this.config?.live2dLocation === "right" ? "-mr-1" : "-ml-1"
      } w-9 hover:transform-translate-x-0 
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
    this.dispatchEvent(new ToggleCanvasEvent({ isShow: this._isShow }));
  }

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

export const Live2dToggleComponent = createComponent({
  tagName: "live2d-toggle",
  elementClass: Live2dToggle,
  react: React,
});
