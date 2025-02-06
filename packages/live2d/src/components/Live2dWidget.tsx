import { html, type TemplateResult } from "lit";
import { UnoLitElement } from "../common/UnoLitElement";
import { createComponent } from "@lit/react";
import React from "react";
import { state } from "lit/decorators.js";

export class Live2dWidget extends UnoLitElement {
  render(): TemplateResult {
    return html`
    <div id="live2d-plugin">
      
    </div>
    `;
  }
}

customElements.define("live2d-widget", Live2dWidget);

export const Live2dWidgetComponent = createComponent({
  tagName: "live2d-widget",
  elementClass: Live2dWidget,
  react: React,
})