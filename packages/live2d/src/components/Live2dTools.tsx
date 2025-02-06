import { html, type TemplateResult } from "lit";
import { UnoLitElement } from "../common/UnoLitElement";
import { createComponent } from "@lit/react";
import React from "react";

export class Live2dTools extends UnoLitElement {
  render(): TemplateResult {
    return html`
    <div id="live2d-tools">
      
    </div>
    `;
  }
}

customElements.define("live2d-tools", Live2dTools);

export const Live2dToolsComponent = createComponent({
  tagName: "live2d-tools",
  elementClass: Live2dTools,
  react: React,
})