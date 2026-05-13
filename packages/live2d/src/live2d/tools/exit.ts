import { ToggleCanvasEvent } from "@/live2d/events/toggle-canvas";
import { sendMessage } from "@/live2d/helpers/sendMessage";
import { Tool } from "@/live2d/live2d/tools/tools";
import { isNotEmptyString } from "@/live2d/utils/isString";

/**
 * 退出 Live2d 工具
 */
export class ExitTool extends Tool {
	priority = 10;

	icon() {
		const icon = this.getConfig().exitIcon;
		return isNotEmptyString(icon) ? icon : "ph-x-bold";
	}

	name(): string {
		return "quit";
	}

	execute() {
		sendMessage("愿你有一天能与重要的人重逢。", 2000, 4);
		setTimeout(() => {
			// 触发退出 Live2d 事件
			window.dispatchEvent(new ToggleCanvasEvent({ isShow: false }));
		}, 3000);
	}
}
