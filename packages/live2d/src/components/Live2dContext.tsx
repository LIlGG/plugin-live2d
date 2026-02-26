import { createComponent } from "@lit/react";
import { type TemplateResult, html } from "lit";
import React from "react";
import { UnoLitElement } from "@/live2d/common/UnoLitElement";
import "@/live2d/components/Live2dWidget";
import { provide } from "@lit/context";
import {
  type Live2dConfig,
  configContext,
} from "@/live2d/context/config-context";
import "@/live2d/events";

export class Live2dContext extends UnoLitElement {
  @provide({ context: configContext })
  config = {
    apiPath: "https://live2d.fghrsh.net/api",
    live2dLocation: "right",
    consoleShowStatus: false,
    isTools: true,
  } as Live2dConfig;

  render(): TemplateResult {
    return html` <live2d-widget></live2d-widget> `;
  }
}

customElements.define("live2d-context", Live2dContext);

export const Live2dContextComponent = createComponent({
  tagName: "live2d-context",
  elementClass: Live2dContext,
  react: React,
});
