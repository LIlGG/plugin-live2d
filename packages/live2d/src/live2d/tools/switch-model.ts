import { isNotEmptyString } from "@/live2d/utils/isString";
import { Tool } from "./tools";

/**
 * 切换模型工具
 */
export class SwitchModelTool extends Tool {
  priority = 70;
  private static readonly COOLDOWN_MS = 1500;

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
      return model.loadOtherModel();
    }
  }

  protected cooldownMs(): number {
    return SwitchModelTool.COOLDOWN_MS;
  }
}
