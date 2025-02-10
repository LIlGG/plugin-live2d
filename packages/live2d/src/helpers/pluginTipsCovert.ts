import type { Live2dConfig } from "../context/config-context";

export function backendConfigConvert(config: Live2dConfig) {
  const tips = {
    click: [],
    mouseover: [],
    message: {},
  };
  // selector
  if (!!config["selectorTips"]) {
    config["selectorTips"].forEach((item) => {
      let texts = item["messageTexts"].map((text) => text.message);
      let obj = {
        selector: item["selector"],
        text: texts,
      };
      if (item["mouseAction"] === "click") {
        tips.click.push(obj);
      } else {
        tips.mouseover.push(obj);
      }
    });
  }
  // message
  tips.message.visibilitychange = config["backSiteTip"];
  tips.message.copy = config["copyContentTip"];
  tips.message.console = config["openConsoleTip"];
  return tips;
};