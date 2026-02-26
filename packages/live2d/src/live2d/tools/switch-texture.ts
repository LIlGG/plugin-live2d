import { isNotEmptyString } from "@/live2d/utils/isString";
import { Tool } from "@/live2d/live2d/tools/tools";

/**
 * 切换纹理工具
 */
export class SwitchTextureTool extends Tool {
  priority = 60;

  icon() {
    const icon = this.getConfig().switchTextureIcon;
    return isNotEmptyString(icon) ? icon : "ph-arrows-counter-clockwise-fill";
  }

  execute() {
    // 发出切换模型的事件
  }
}
