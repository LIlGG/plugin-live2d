import { isNotEmptyString } from "@/live2d/utils/isString";
import { Tool } from "./tools";

/**
 * 切换模型工具
 */
export class SwitchModelTool extends Tool {
  priority = 70;

  name(): string {
    return "switch-model";
  }

  icon() {
    const icon = this.getConfig().switchModelIcon;
    return isNotEmptyString(icon) ? icon : "ph-arrows-counter-clockwise-fill";
  }

  execute() {
    const model = this.getModel();
    if (model) {
      model.loadOtherModel();
    }
  }
}
