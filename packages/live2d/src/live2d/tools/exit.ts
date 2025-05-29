import { sendMessage } from "../../helpers/sendMessage";
import { isNotEmptyString } from "../../utils/isString";
import { Tool } from "./tools";
import { ToggleCanvasEvent } from "../../events/toggle-canvas";

/**
 * 退出 Live2d 工具
 */
export class ExitTool extends Tool {
  priority = 10;

  icon() {
    const icon = this.getConfig().exitIcon;
    return isNotEmptyString(icon) ? icon : "ph-x-bold";
  }

  execute() {
    sendMessage("愿你有一天能与重要的人重逢。", 2000, 4);
    setTimeout(() => {
      // 触发退出 Live2d 事件
      window.dispatchEvent(new ToggleCanvasEvent({ isShow: false }));
    }, 3000);
  }
}
