import { html, type TemplateResult } from "lit";
import { UnoLitElement } from "../common/UnoLitElement";
import { createComponent } from "@lit/react";
import React from "react";
import { consume } from "@lit/context";
import { configContext, type Live2dConfig } from "../context/config-context";
import { property } from "lit/decorators.js";

export class Live2dTools extends UnoLitElement {
	@consume({ context: configContext })
	@property({ attribute: false })
	public config?: Live2dConfig;

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
});
