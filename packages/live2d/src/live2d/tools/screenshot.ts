import { sendMessage } from "helpers/sendMessage";
import { isNotEmptyString } from "../../utils/isString";
import { Tool } from "./tools";

declare const Live2D: {
  captureName: string;
  captureFrame: boolean;
};

/**
 * 截图工具
 */
export class ScreenshotTool extends Tool {
  name() {
    return "Screenshot";
  }

  icon() {
    const icon = this.getConfig().screenshotIcon;
    return isNotEmptyString(icon) ? icon : "ph-arrows-counter-clockwise-fill";
  }

  execute() {
    sendMessage("照好了嘛，是不是很可爱呢？", 6000, 2);
    const screenshotName = this.getConfig().screenshotName || 'live2d';
    Live2D.captureName = `${screenshotName}.png`;
    Live2D.captureFrame = true;
  }
}