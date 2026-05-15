import type { Live2dConfig, TipConfig } from "@/live2d/context/config-context";
import { getPluginTips } from "@/live2d/helpers/getPluginTips";
import { loadFullTipsResource } from "@/live2d/helpers/loadFullTipsResource";
import { loadTipsResource } from "@/live2d/helpers/loadTipsResource";
import { mergeTips } from "@/live2d/helpers/mergeTips";

const mergedTipsCache = new WeakMap<Live2dConfig, Promise<TipConfig>>();

const loadDefaultTips = async (): Promise<TipConfig> => {
  return (await import("../libs/live2d-tips.json")).default;
};

const createThemeTips = async (config: Live2dConfig): Promise<TipConfig> => {
  const themeTipsResult = await loadTipsResource(config.themeTipsPath);
  return {
    click: themeTipsResult?.click || [],
    mouseover: themeTipsResult?.mouseover || [],
    seasons: [],
    time: [],
    message: {},
  };
};

const createMergedTips = async (config: Live2dConfig): Promise<TipConfig> => {
  const pluginTips = getPluginTips(config);
  const themeTips = await createThemeTips(config);
  const fullOrDefaultTips = await loadFullTipsResource(
    config?.tipsPath,
    loadDefaultTips,
  );
  return mergeTips({
    pluginTips,
    themeTips,
    fullOrDefaultTips,
  });
};

export const loadMergedTips = (config: Live2dConfig): Promise<TipConfig> => {
  const cachedTips = mergedTipsCache.get(config);
  if (cachedTips) {
    return cachedTips;
  }

  const nextTips = createMergedTips(config);
  mergedTipsCache.set(config, nextTips);
  return nextTips;
};
