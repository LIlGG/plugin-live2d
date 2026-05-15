import { Tool } from "@/live2d/live2d/tools/tools";
import { isNotEmptyString } from "@/live2d/utils/isString";

/**
 * 切换纹理工具
 */
export class SwitchTextureTool extends Tool {
  priority = 60;
  private static readonly COOLDOWN_MS = 1500;

  name(): string {
    return "switch-texture";
  }

  icon() {
    const icon = this.getConfig().switchTextureIcon;
    return isNotEmptyString(icon) ? icon : "ph-dress-fill";
  }

  /**
   * 执行工具 - 直接调用 model 的切换纹理方法
   */
  execute() {
    const model = this.getModel();
    if (model) {
      return model.loadRandTextures();
    }
  }

  protected cooldownMs(): number {
    return SwitchTextureTool.COOLDOWN_MS;
  }
}
