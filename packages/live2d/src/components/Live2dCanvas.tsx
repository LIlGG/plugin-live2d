import { html, type TemplateResult } from "lit";
import { UnoLitElement } from "../common/UnoLitElement";
import { createComponent } from "@lit/react";
import React from "react";

export class Live2dCanvas extends UnoLitElement {
  render(): TemplateResult {
    return html`
    <div id="live2d" width="800" height="800">
      
    </div>
    `;
  }
}

customElements.define("live2d-canvas", Live2dCanvas);

export const Live2dCanvasComponent = createComponent({
  tagName: "live2d-canvas",
  elementClass: Live2dCanvas,
  react: React,
})