import { normalizeCustomTools } from "@/live2d/config/custom-tools/normalize-custom-tools";
import { createDefaultLive2dConfig } from "@/live2d/config/default-config";
import {
  ensureTrailingSlash,
  pickBoolean,
  pickNumber,
  pickString,
} from "@/live2d/config/normalize-helpers";
import type { Live2dConfig } from "@/live2d/context/config-context";
import { isNotEmptyString } from "@/live2d/utils/isString";

export interface LegacyLive2dConfigInput extends Partial<Live2dConfig> {
  aiChatBaseSetting?: {
    chunkTimeout?: number | string;
    showChatMessageTimeout?: number | string;
  };
  consoleShowStatu?: boolean;
  photoName?: string;
  tips?: string;
}

const normalizeTools = (tools: unknown): string[] | undefined => {
  if (!Array.isArray(tools)) {
    return;
  }
  return tools.filter((tool): tool is string => isNotEmptyString(tool));
};

export const normalizeLive2dConfig = (
  assetPath: string,
  input: LegacyLive2dConfigInput = {},
): Live2dConfig => {
  const defaults = createDefaultLive2dConfig();
  const normalizedAssetPath = isNotEmptyString(assetPath)
    ? ensureTrailingSlash(assetPath)
    : "";

  const normalizedApiPath = pickString(input.apiPath, defaults.apiPath);
  if (!normalizedApiPath) {
    throw new Error("Invalid initWidget argument!");
  }

  return {
    ...defaults,
    ...input,
    apiPath: ensureTrailingSlash(normalizedApiPath),
    live2dLocation: input.live2dLocation === "right" ? "right" : "left",
    consoleShowStatus: pickBoolean(
      input.consoleShowStatus,
      input.consoleShowStatu,
      defaults.consoleShowStatus,
    ),
    themeTipsPath: pickString(input.themeTipsPath, input.tips),
    tipsPath:
      pickString(input.tipsPath) ?? `${normalizedAssetPath}live2d-tips.json`,
    screenshotName:
      pickString(input.screenshotName, input.photoName) ??
      defaults.screenshotName,
    tools: normalizeTools(input.tools) ?? [...(defaults.tools ?? [])],
    customTools: normalizeCustomTools(input.customTools) ?? [],
    chunkTimeout:
      pickNumber(
        input.chunkTimeout,
        input.aiChatBaseSetting?.chunkTimeout,
        defaults.chunkTimeout,
      ) ?? defaults.chunkTimeout,
    showChatMessageTimeout:
      pickNumber(
        input.showChatMessageTimeout,
        input.aiChatBaseSetting?.showChatMessageTimeout,
        defaults.showChatMessageTimeout,
      ) ?? defaults.showChatMessageTimeout,
    backSite: pickBoolean(input.backSite, defaults.backSite),
    copyContent: pickBoolean(input.copyContent, defaults.copyContent),
    openConsole: pickBoolean(input.openConsole, defaults.openConsole),
    firstOpenSite: pickBoolean(input.firstOpenSite, defaults.firstOpenSite),
    isTools: pickBoolean(input.isTools, defaults.isTools),
    isAiChat: pickBoolean(input.isAiChat, defaults.isAiChat),
  };
};
