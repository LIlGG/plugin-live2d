import { isNotEmptyString } from "../../utils/isString";
import { Tool } from "./tools";

/**
 * 切换纹理工具
 */
export class SwitchTextureTool extends Tool {
  name() {
    return "SwitchTexture";
  }

  icon() {
    const icon = this.getConfig().switchTextureIcon;
    return isNotEmptyString(icon) ? icon : "ph-camera-fill";
  }

  execute() {
    // 发出切换模型的事件
  }
}