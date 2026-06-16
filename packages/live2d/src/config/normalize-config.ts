import { normalizeAgentRuntimeConfig } from "@/live2d/config/agent-tools/normalize-agent-tools";
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
    autoContinuationMessageMinVisibleMs?: number | string;
    requestAcceptedMessage?: string;
    reasoningMessages?: string[] | string | { message?: string }[];
    reasoningMessageInterval?: number | string;
    chatContextRounds?: number | string;
    accessMode?: Live2dConfig["accessMode"];
    isAnonymous?: boolean;
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

const normalizeMessages = (messages: unknown): string[] | undefined => {
  if (isNotEmptyString(messages)) {
    return [messages];
  }
  if (!Array.isArray(messages)) {
    return;
  }
  const normalized = messages
    .map((message) => {
      if (isNotEmptyString(message)) {
        return message;
      }
      if (
        typeof message === "object" &&
        message !== null &&
        "message" in message &&
        isNotEmptyString(message.message)
      ) {
        return message.message;
      }
      return undefined;
    })
    .filter((message): message is string => message !== undefined);
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeAccessMode = (
  accessMode: unknown,
  legacyAnonymous: unknown,
): Live2dConfig["accessMode"] => {
  if (
    accessMode === "anonymous_chat" ||
    accessMode === "anonymous_chat_agent" ||
    accessMode === "authenticated_chat" ||
    accessMode === "authenticated_chat_agent"
  ) {
    return accessMode;
  }
  return legacyAnonymous === false ? "authenticated_chat" : "anonymous_chat";
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
    accessMode: normalizeAccessMode(
      input.accessMode ?? input.aiChatBaseSetting?.accessMode,
      input.aiChatBaseSetting?.isAnonymous,
    ),
    agent: normalizeAgentRuntimeConfig(input.agent),
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
    autoContinuationMessageMinVisibleMs:
      pickNumber(
        input.autoContinuationMessageMinVisibleMs,
        input.aiChatBaseSetting?.autoContinuationMessageMinVisibleMs,
        defaults.autoContinuationMessageMinVisibleMs,
      ) ?? defaults.autoContinuationMessageMinVisibleMs,
    requestAcceptedMessage:
      pickString(
        input.requestAcceptedMessage,
        input.aiChatBaseSetting?.requestAcceptedMessage,
        defaults.requestAcceptedMessage,
      ) ?? defaults.requestAcceptedMessage,
    reasoningMessages:
      normalizeMessages(input.reasoningMessages) ??
      normalizeMessages(input.aiChatBaseSetting?.reasoningMessages) ??
      normalizeMessages(defaults.reasoningMessages) ??
      [],
    reasoningMessageInterval:
      pickNumber(
        input.reasoningMessageInterval,
        input.aiChatBaseSetting?.reasoningMessageInterval,
        defaults.reasoningMessageInterval,
      ) ?? defaults.reasoningMessageInterval,
    chatContextRounds:
      pickNumber(
        input.chatContextRounds,
        input.aiChatBaseSetting?.chatContextRounds,
        defaults.chatContextRounds,
      ) ?? defaults.chatContextRounds,
    backSite: pickBoolean(input.backSite, defaults.backSite),
    copyContent: pickBoolean(input.copyContent, defaults.copyContent),
    openConsole: pickBoolean(input.openConsole, defaults.openConsole),
    firstOpenSite: pickBoolean(input.firstOpenSite, defaults.firstOpenSite),
    isTools: pickBoolean(input.isTools, defaults.isTools),
    isAiChat: pickBoolean(input.isAiChat, defaults.isAiChat),
  };
};
