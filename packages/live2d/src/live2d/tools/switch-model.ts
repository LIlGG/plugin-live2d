import { isNotEmptyString } from "../../utils/isString";
import { Tool } from "./tools";

/**
 * 切换模型工具
 */
export class SwitchModelTool extends Tool {
  name() {
    return "SwitchModel";
  }

  icon() {
    const icon = this.getConfig().switchModelIcon;
    return isNotEmptyString(icon) ? icon : "ph-dress-fill";
  }

  execute() {
    console.log("Model switch event emitted.");
  }
}