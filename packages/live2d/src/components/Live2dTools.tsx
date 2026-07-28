import { UnoLitElement } from "@/live2d/common/UnoLitElement";
import {
  type Live2dConfig,
  configContext,
} from "@/live2d/context/config-context";
import type { ModelReadyEvent } from "@/live2d/events/model-ready";
import type Model from "@/live2d/live2d/model";
import { defaultToolNames, toolRegistry } from "@/live2d/live2d/tools";
import { CustomTool } from "@/live2d/live2d/tools/custom-tool";
import type { Tool } from "@/live2d/live2d/tools/tools";
import { consume } from "@lit/context";
import { type PropertyValues, type TemplateResult, html } from "lit";
import { property, state } from "lit/decorators.js";
import "iconify-icon";

export class Live2dTools extends UnoLitElement {
  private static readonly AI_CHAT_TOOL_NAMES = new Set(["chat", "openai"]);

  @consume({ context: configContext })
  @property({ attribute: false })
  public config?: Live2dConfig;

  @property({ type: Boolean })
  public compact = false;

  private model?: Model | null;

  @state()
  private _tools: Tool[] = [];

  @state()
  private _isExpanded = false;

  @state()
  private _hoveredToolIndex: number | null = null;

  private readonly onModelReady = (event: Event) => {
    this.handleModelReady(event as ModelReadyEvent);
  };

  render(): TemplateResult {
    if (this._tools.length === 0) {
      return html``;
    }

    const isExpanded = !this.compact || this._isExpanded;
    const shellClass = [
      "flex min-w-11 flex-col items-center overflow-hidden rounded-full",
      "border border-[#f3d7b8]/80 p-1",
      "transition-[gap,background-color,border-color] duration-300",
      isExpanded ? "gap-1" : "gap-0",
    ].join(" ");
    const shellBackground = this.compact
      ? "linear-gradient(145deg, rgba(255, 250, 244, 0.86), rgba(255, 255, 255, 0.68))"
      : "linear-gradient(145deg, rgba(255, 250, 244, 0.72), rgba(255, 255, 255, 0.5))";
    const toolsClass = [
      "relative flex w-9 flex-col items-center gap-1 overflow-x-hidden overflow-y-auto",
      "overscroll-contain transition-[max-height,opacity,transform] duration-300",
      isExpanded
        ? "pointer-events-auto translate-y-0 opacity-100"
        : "pointer-events-none -translate-y-2 opacity-0",
    ].join(" ");
    const toolsMaxHeight = isExpanded
      ? this.compact
        ? "min(10rem, calc(42vh - 3rem))"
        : "calc(100vh - 4rem)"
      : "0px";

    return html`<div
      id="live2d-tools-shell"
      class=${shellClass}
      style="background: ${shellBackground}; border-color: rgba(243, 215, 184, 0.82); box-shadow: 0 3px 10px rgba(139, 94, 52, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.9); backdrop-filter: blur(14px) saturate(1.15); -webkit-backdrop-filter: blur(14px) saturate(1.15);"
      @keydown=${this.handleDrawerKeydown}
    >
      <div
        id="live2d-tools"
        class=${toolsClass}
        style="max-height: ${toolsMaxHeight}; scrollbar-width: thin; scrollbar-color: rgba(139, 94, 52, 0.28) transparent;"
        aria-hidden=${isExpanded ? "false" : "true"}
        @mouseleave=${this.clearHoveredTool}
        @focusout=${this.handleToolsFocusOut}
      >
        ${this.renderHoverIndicator()}
        ${this._tools.map((tool, index) =>
          this.renderTool(tool, isExpanded, index),
        )}
      </div>
      ${this.renderDrawerToggle()}
    </div>`;
  }

  renderTool(tool: Tool, isExpanded: boolean, index: number): TemplateResult {
    const buttonClass =
      "relative z-1 inline-flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-0 color-[#7b8c9d] transition-colors duration-200 hover:color-[#0684bd] focus-visible:color-[#0684bd] focus-visible:outline-2 focus-visible:outline-[#ffb86c] focus-visible:outline-offset-[-2px]";
    return html`<button
      id="live2d-tool-${tool.name()}"
      type="button"
      class=${buttonClass}
      title=${tool.name()}
      aria-label=${tool.name()}
      tabindex=${isExpanded ? "0" : "-1"}
      @mouseenter=${() => {
        this._hoveredToolIndex = index;
      }}
      @focus=${() => {
        this._hoveredToolIndex = index;
      }}
      @click=${() => this.executeTool(tool)}
    >
      <iconify-icon
        class="inline-block h-5 w-5 text-size-xl"
        icon="${tool.icon()}"
      ></iconify-icon>
    </button>`;
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has("compact") && this.compact) {
      this._isExpanded = false;
      this._hoveredToolIndex = null;
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("live2d:model-ready", this.onModelReady);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("live2d:model-ready", this.onModelReady);
  }

  handleModelReady(e: ModelReadyEvent): void {
    this.model = e.detail.model;
    if (!this.config) {
      return;
    }
    if (this._tools.length === 0) {
      this.initializeTools();
      return;
    }
    for (const tool of this._tools) {
      tool.setModel(this.model);
    }
  }

  private renderDrawerToggle(): TemplateResult | undefined {
    if (!this.compact) {
      return;
    }

    return html`<button
      id="live2d-tools-toggle"
      type="button"
      class="inline-flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full border-none bg-[#ffb86c] p-0 color-white shadow-[inset_0_1px_0_rgba(255,255,255,0.38)] transition-colors duration-200 hover:bg-[#ffa952] focus-visible:outline-2 focus-visible:outline-[#8b5e34] focus-visible:outline-offset-2"
      aria-controls="live2d-tools"
      aria-expanded=${this._isExpanded ? "true" : "false"}
      aria-label=${this._isExpanded ? "收起工具箱" : "展开工具箱"}
      title=${this._isExpanded ? "收起工具箱" : "展开工具箱"}
      @click=${() => {
        this._isExpanded = !this._isExpanded;
      }}
    >
      <iconify-icon
        icon=${this._isExpanded ? "ph:caret-down-bold" : "ph:dots-nine-bold"}
        width="20"
        height="20"
      ></iconify-icon>
    </button>`;
  }

  private readonly handleDrawerKeydown = (event: KeyboardEvent): void => {
    if (!this.compact || event.key !== "Escape" || !this._isExpanded) {
      return;
    }
    event.preventDefault();
    this._isExpanded = false;
    this.updateComplete.then(() => {
      this.renderRoot
        .querySelector<HTMLButtonElement>("#live2d-tools-toggle")
        ?.focus();
    });
  };

  private renderHoverIndicator(): TemplateResult {
    const offset = (this._hoveredToolIndex ?? 0) * 40;
    const isVisible = this._hoveredToolIndex !== null;
    return html`<span
      id="live2d-tools-hover-indicator"
      class="pointer-events-none absolute left-0 top-0 h-9 w-9 box-border rounded-full border border-white/90"
      style="opacity: ${
        isVisible ? "1" : "0"
      }; transform: translate3d(0, ${offset}px, 0); background: rgba(255, 255, 255, 0.85); box-shadow: 0 1px 5px rgba(139, 94, 52, 0.09), inset 0 1px 0 rgba(255, 255, 255, 0.92); transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 140ms ease;"
      aria-hidden="true"
    ></span>`;
  }

  private readonly clearHoveredTool = (): void => {
    this._hoveredToolIndex = null;
  };

  private readonly handleToolsFocusOut = (event: FocusEvent): void => {
    const nextTarget = event.relatedTarget;
    if (
      nextTarget instanceof Node &&
      event.currentTarget instanceof HTMLElement &&
      event.currentTarget.contains(nextTarget)
    ) {
      return;
    }
    this._hoveredToolIndex = null;
  };

  private executeTool(tool: Tool): void {
    this._hoveredToolIndex = null;
    if (this.compact) {
      this._isExpanded = false;
    }
    void tool.triggerExecute();
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
    const configuredNames =
      this.config.tools && this.config.tools.length > 0
        ? [...this.config.tools]
        : [...defaultToolNames];

    const enabledNames = configuredNames.filter((toolName) => {
      if (this.config?.isAiChat) {
        return true;
      }
      return !Live2dTools.AI_CHAT_TOOL_NAMES.has(toolName);
    });

    if (this.config.isAiChat) {
      enabledNames.unshift("chat");
    }
    const mountTool: Tool[] = [];
    const seen = new Set<string>();
    for (const toolName of enabledNames) {
      const ToolClass = toolRegistry[toolName];
      if (ToolClass) {
        if (seen.has(toolName)) {
          continue;
        }
        seen.add(toolName);
        mountTool.push(new ToolClass(this.config, this.model));
      }
    }
    return mountTool;
  }
}

customElements.define("live2d-tools", Live2dTools);
