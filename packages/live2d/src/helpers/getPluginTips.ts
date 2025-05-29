import type { Live2dConfig, TipConfig } from "../context/config-context";
import { isNotEmpty } from "../utils/isNotEmpty";

/**
 * 整合插件配置中的 tips 元素。
 * 
 * 插件配置中的元素如下所示：
 * "selectorTips" : [ {
 *   "mouseAction" : "mouseover",
 *   "selector" : "#select",
 *   "messageTexts" : [ {
 *      "message" : "123"
 *    }, {
 *   "message" : "1231"
 *    }]
 *  }],
 *  "copyContentTip" : "你都复制了些什么呀，转载要记得加上出处哦！",
 *  "openConsoleTip" : "你是想要看看我的小秘密吗？",
 */
export const getPluginTips = (config: Live2dConfig): TipConfig => {
  const tips: TipConfig = {
    seasons: [],
    click: [],
    mouseover: [],
    time: [],
    message: {},
  };
  // selector
  if (config.selectorTips) {
    for (const item of config.selectorTips) {
      const texts = item.messageTexts?.map((text) => text.message);
      if (!texts) {
        continue;
      }
      const obj = {
        selector: item.selector,
        text: texts,
      };
      if (item.mouseAction === "click") {
        tips.click?.push(obj);
      } else {
        tips.mouseover?.push(obj);
      }
    }
  }
  // message
  if (isNotEmpty(config.backSiteTip)) {
    tips.message.visibilitychange = config.backSiteTip;
  }
  if (isNotEmpty(config.copyContentTip)) {
    tips.message.copy = config.copyContentTip;
  }
  if (isNotEmpty(config.openConsoleTip)) {
    tips.message.console = config.openConsoleTip;
  }
  return tips;
}