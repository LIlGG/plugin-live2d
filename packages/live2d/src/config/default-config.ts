import type { Live2dConfig } from "@/live2d/context/config-context";

export const DEFAULT_TOOL_NAMES = [
  "hitokoto",
  "asteroids",
  "switch-model",
  "switch-texture",
  "photo",
  "info",
  "quit",
] as const;

export const createDefaultLive2dConfig = (): Live2dConfig => ({
  apiPath: "https://live2d.fghrsh.net/api/",
  live2dLocation: "left",
  consoleShowStatus: false,
  isForceUseDefaultConfig: false,
  modelId: 1,
  modelTexturesId: 53,
  tipsPath: "",
  selectorTips: [],
  backSite: true,
  backSiteTip: "",
  copyContent: true,
  copyContentTip: "",
  openConsole: true,
  openConsoleTip: "",
  firstOpenSite: true,
  isTools: true,
  tools: [...DEFAULT_TOOL_NAMES],
  isAiChat: false,
  chunkTimeout: 10,
  showChatMessageTimeout: 10,
  screenshotName: "live2d",
});
