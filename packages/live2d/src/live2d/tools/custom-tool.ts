import type { Live2dConfig } from "@/live2d/context/config-context";
import type Model from "@/live2d/live2d/model";
import { isNotEmptyString } from "@/live2d/utils/isString";
import { Tool } from "@/live2d/live2d/tools/tools";

export type CustomToolConfig = {
  name: string;
  icon?: string;
  priority?: number;
  execute: ((config: Live2dConfig) => void) | string;
};

/**
 * 自定义工具
 */
export class CustomTool extends Tool {
  priority: number;
  _name: string;
  _icon?: string;
  _execute: ((config: Live2dConfig) => void) | string;

  constructor(
    config: Live2dConfig,
    { name, icon, execute, priority }: CustomToolConfig,
    model?: Model | null
  ) {
    super(config, model);
    this._name = name;
    this._icon = icon;
    this._execute = execute;
    this.priority = priority || 0;
  }

  name() {
    return this._name;
  }

  icon() {
    const icon = this._icon;
    return isNotEmptyString(icon) ? icon : "ph-question-fill";
  }

  execute() {
    if (typeof this._execute === "string") {
      const customClass = new Function(`
        return class {
          ${this._execute}
        }
      `)();
      new customClass().execute.bind(this)(this.getConfig());
      return;
    }
    this._execute.bind(this)(this.getConfig());
  }
}
