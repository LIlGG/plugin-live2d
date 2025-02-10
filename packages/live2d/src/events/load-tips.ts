import type { Live2dConfig, TipConfig } from "../context/config-context";
import { getPluginTips } from "../helpers/getPluginTips";
import { loadTipsResource } from "../helpers/loadTipsResource";
import { mergeTips } from "../helpers/mergeTips";
import { isNotEmptyString } from "../util/isString";

window.addEventListener("live2d:before-init", async (e) => {
  const config = e.detail.config;
  const tips = await _loadTips(config);
  console.log("tips", tips);
})

const _loadTips = async (config: Live2dConfig) => {
  if (!config) {
    return;
  }
  // 后台配置 tips，其中包含 mouseover 及 click 两种配置，以及单独配置的 message
  const pluginTips = getPluginTips(config);
  // 主题设置 tips，只会包含 mouseover 及 click 两种配置（会过滤掉其他配置）
  const themeTipsResult = await loadTipsResource(config.themeTipsPath);
  const themeTips: TipConfig = {
    click: themeTipsResult?.click || [],
    mouseover: themeTipsResult?.mouseover || [],
    seasons: [],
    message: {},
  };
  const fullOrDefaultTips = await _getFullOrDefaultTips(config);
  // 合并三种 tips
  return mergeTips({
    pluginTips,
    themeTips,
    fullOrDefaultTips,
  });
}

export const _getFullOrDefaultTips = async (config: Live2dConfig): Promise<TipConfig> => {
  // 获取插件文件中的全量 tips 文件
  if (isNotEmptyString(config?.tipsPath)) {
    const tipsResult = await loadTipsResource(config.tipsPath);
    if (tipsResult) {
      return tipsResult;
    }
  }
  // 获取默认的 tips 文件
  return (await import("../libs/live2d-tips.json")).default;
}
