import type { Live2dConfig } from "@/live2d/context/config-context";
import type Model from "@/live2d/live2d/model";
import { executeCustomToolAction } from "@/live2d/live2d/tools/custom-tool-actions/index";
import type { CustomToolConfig } from "@/live2d/live2d/tools/custom-tool-config";
import { Tool } from "@/live2d/live2d/tools/tools";
import { isNotEmptyString } from "@/live2d/utils/isString";

/**
 * 自定义工具
 */
export class CustomTool extends Tool {
  priority: number;
  _name: string;
  _icon?: string;
  _tool: CustomToolConfig;

  constructor(
    config: Live2dConfig,
    tool: CustomToolConfig,
    model?: Model | null,
  ) {
    super(config, model);
    this._tool = tool;
    this._name = tool.name;
    this._icon = tool.icon;
    this.priority = tool.priority || 0;
  }

  name() {
    return this._name;
  }

  icon() {
    const icon = this._icon;
    return isNotEmptyString(icon) ? icon : "ph-question-fill";
  }

  execute() {
    return executeCustomToolAction(
      {
        config: this.getConfig(),
        model: this.getModel(),
        tool: this._tool,
      },
      this._tool.action,
    );
  }
}
