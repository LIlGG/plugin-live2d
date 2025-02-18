import { html, type TemplateResult } from "lit";
import { UnoLitElement } from "../common/UnoLitElement";
import { createComponent } from "@lit/react";
import React from "react";
import "./Live2dWidget";
import { provide } from "@lit/context";
import { configContext, type Live2dConfig } from "../context/config-context";
import "../events";

export class Live2dContext extends UnoLitElement {
	@provide({ context: configContext })
	config = {
		apiPath: "https://live2d.fghrsh.net/api",
		live2dLocation: "right",
		consoleShowStatus: false,
		isTools: true,
	} as Live2dConfig;

	render(): TemplateResult {
		return html`
    <live2d-widget></live2d-widget>
    `;
	}
}

customElements.define("live2d-context", Live2dContext);

export const Live2dContextComponent = createComponent({
	tagName: "live2d-context",
	elementClass: Live2dContext,
	react: React,
});
