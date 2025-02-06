import { html, type TemplateResult } from "lit";
import { UnoLitElement } from "../common/UnoLitElement";
import { createComponent } from "@lit/react";
import React from "react";

export class Live2dTips extends UnoLitElement {
  render(): TemplateResult {
    return html`
    <div id="live2d-tips">
      
    </div>
    `;
  }
}

customElements.define("live2d-tips", Live2dTips);

export const Live2dTipsComponent = createComponent({
  tagName: "live2d-tips",
  elementClass: Live2dTips,
  react: React,
})