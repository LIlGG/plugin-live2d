import { UnoLitElement } from "@/live2d/common/UnoLitElement";
import { type TemplateResult, html } from "lit";
import { property } from "lit/decorators.js";
import "@/live2d/components/Live2dWidget";
import { createDefaultLive2dConfig } from "@/live2d/config/default-config";
import {
  type Live2dConfig,
  configContext,
} from "@/live2d/context/config-context";
import { provide } from "@lit/context";
import "@/live2d/events";

export class Live2dContext extends UnoLitElement {
  @provide({ context: configContext })
  @property({ attribute: false })
  config: Live2dConfig = createDefaultLive2dConfig();

  render(): TemplateResult {
    return html` <live2d-widget></live2d-widget> `;
  }
}

customElements.define("live2d-context", Live2dContext);
