import { html, type TemplateResult } from "lit";
import { UnoLitElement } from "../common/UnoLitElement";
import { createComponent } from "@lit/react";
import React from "react";
import { consume } from "@lit/context";
import { configContext, type Live2dConfig } from "../context/config-context";
import { property, state } from "lit/decorators.js";
import type { Tool } from "../live2d/tools/tools";
import { CustomTool } from "../live2d/tools/custom-tool";
import presetTools from "../live2d/tools";
import "iconify-icon";

export class Live2dTools extends UnoLitElement {
  @consume({ context: configContext })
  @property({ attribute: false })
  public config?: Live2dConfig;

  @state()
  private _tools: Tool[] = [];

  render(): TemplateResult {
    return html`<div id="live2d-tools" class="flex flex-col gap-2 items-center justify-center">
      ${this._tools.map(this.renderTool)}
    </div>`;
  }

  renderTool(tool: Tool): TemplateResult {
    return html`<span
      class="live2d-tool-${tool.name()}"
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
    // 根据配置生成对应的工具
    this.initializeTools();
  }

  private initializeTools(): void {
    // 获取预设工具
    const presetTools = this.getPresetTools();
    // 获取自定义工具
    const customTools = this.getCustomTools();
    // 合并所有工具，并按照 priority 排序
    const tools = [...presetTools, ...customTools].sort(
      (a, b) => b.priority - a.priority
    );
    this._tools.push(...tools);
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
      const customTool = new CustomTool(this.config, tool);
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
      // 加载所有预设工具
      for (const Tool of presetTools) {
        mountTool.push(new Tool(this.config));
      }
      return mountTool;
    }

    for (const toolName of tools) {
      const ToolClass = presetTools.find((t) => t.name === toolName);
      if (ToolClass) {
        mountTool.push(new ToolClass(this.config));
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
