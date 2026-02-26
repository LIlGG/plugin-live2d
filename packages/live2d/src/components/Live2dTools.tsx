import { consume } from "@lit/context";
import { createComponent } from "@lit/react";
import { type TemplateResult, html } from "lit";
import { property, state } from "lit/decorators.js";
import React from "react";
import { UnoLitElement } from "@/live2d/common/UnoLitElement";
import {
	type Live2dConfig,
	configContext,
} from "@/live2d/context/config-context";
import type { ModelReadyEvent } from "@/live2d/events/model-ready";
import type Model from "@/live2d/live2d/model";
import presetTools from "@/live2d/live2d/tools";
import { CustomTool } from "@/live2d/live2d/tools/custom-tool";
import type { Tool } from "@/live2d/live2d/tools/tools";
import "iconify-icon";

export class Live2dTools extends UnoLitElement {
	@consume({ context: configContext })
	@property({ attribute: false })
	public config?: Live2dConfig;

	private model?: Model | null;

	@state()
	private _tools: Tool[] = [];

	render(): TemplateResult {
		return html`<div
      id="live2d-tools"
      class="flex flex-col gap-2 items-center justify-center"
    >
      ${this._tools.map(this.renderTool)}
    </div>`;
	}

	renderTool(tool: Tool): TemplateResult {
		return html`<span
      id="live2d-tool-${tool.name()}"
      @click=${() => tool.execute()}
    >
      <iconify-icon
        class="inline-block w-4 h-4 text-size-xl cursor-pointer color-#7b8c9d hover:color-#0684bd"
        icon="${tool.icon()}"
      ></iconify-icon>
    </span>`;
	}

	connectedCallback(): void {
		super.connectedCallback();
		window.addEventListener(
			"live2d:model-ready",
			this.handleModelReady.bind(this),
		);
	}

	disconnectedCallback(): void {
		super.disconnectedCallback();
		window.removeEventListener(
			"live2d:model-ready",
			this.handleModelReady.bind(this),
		);
	}

	handleModelReady(e: ModelReadyEvent): void {
		this.model = e.detail.model;
		if (this.config && this._tools.length === 0) {
			this.initializeTools();
		}
	}

	private initializeTools(): void {
		const presetToolsList = this.getPresetTools();
		const customTools = this.getCustomTools();
		const tools = [...presetToolsList, ...customTools].sort(
			(a, b) => b.priority - a.priority,
		);
		this._tools = tools;
	}

	private getCustomTools(): Tool[] {
		if (!this.config) {
			return [];
		}
		const customTools = this.config?.customTools;
		if (!customTools || customTools.length === 0) {
			return [];
		}
		const mountTool: Tool[] = [];
		for (const tool of customTools) {
			const customTool = new CustomTool(this.config, tool, this.model);
			mountTool.push(customTool);
		}
		return mountTool;
	}

	// 获取预设工具
	private getPresetTools(): Tool[] {
		if (!this.config) {
			return [];
		}
		const mountTool: Tool[] = [];
		const tools = this.config?.tools;

		if (!tools || tools.length === 0) {
			// 没有指定工具列表，加载所有预设工具
			for (const tool of presetTools) {
				mountTool.push(new tool(this.config, this.model));
			}
			return mountTool;
		}

		for (const toolName of tools) {
			const ToolClass = presetTools.find(
				(t) =>
					t.name === toolName ||
					t.name ===
						`${toolName.charAt(0).toUpperCase() + toolName.slice(1)}Tool`,
			);
			if (ToolClass) {
				mountTool.push(new ToolClass(this.config, this.model));
			}
		}
		return mountTool;
	}
}

customElements.define("live2d-tools", Live2dTools);

export const Live2dToolsComponent = createComponent({
	tagName: "live2d-tools",
	elementClass: Live2dTools,
	react: React,
});
