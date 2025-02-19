import type { Live2dConfig } from "context/config-context";
import { isNotEmptyString } from "utils/isString";
import { Tool } from "./tools";
import { _getFullOrDefaultTips } from '../events/tip-events';

export type CustomToolConfig = {
  name: string;
  icon?: string;
  execute: () => void;
}

/**
 * 自定义工具
 */
export class CustomTool extends Tool {
  _name: string;
  _icon?: string;
  _execute: () => void;

  constructor(config: Live2dConfig, { name, icon, execute }: CustomToolConfig) {
    super(config);
    this._name = name;
    this._icon = icon;
    this._execute = execute;
  }

  name() {
    return this._name;
  }

  icon() {
    const icon = this._icon;
    return isNotEmptyString(icon) ? icon : "ph-question-fill";
  }

  execute() {
    this._execute.bind(this)();
  }
}