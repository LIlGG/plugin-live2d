import type {
  TipClick,
  TipConfig,
  TipMessage,
  TipMouseover,
  TipSeason,
  TipTime,
} from "@/live2d/context/config-context";

type PartialTipConfig = Partial<TipConfig>;
const MISSING_TIPS_CACHE_PREFIX = "plugin-live2d:missing-tips:";

const createEmptyTipConfig = (): TipConfig => ({
  mouseover: [],
  click: [],
  seasons: [],
  message: {},
  time: [],
});

const getMissingTipsCacheKey = (url: string): string =>
  `${MISSING_TIPS_CACHE_PREFIX}${url}`;

const hasWindowSessionStorage = (): boolean =>
  typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";

const wasMissingTipsUrlCached = (url: string): boolean => {
  if (!hasWindowSessionStorage()) {
    return false;
  }

  try {
    return window.sessionStorage.getItem(getMissingTipsCacheKey(url)) === "1";
  } catch {
    return false;
  }
};

const rememberMissingTipsUrl = (url: string): void => {
  if (!hasWindowSessionStorage()) {
    return;
  }

  try {
    window.sessionStorage.setItem(getMissingTipsCacheKey(url), "1");
  } catch {}
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isTipText = (value: unknown): value is string | string[] =>
  typeof value === "string" || isStringArray(value);

const isMouseoverTip = (value: unknown): value is TipMouseover =>
  isRecord(value) &&
  typeof value.selector === "string" &&
  isTipText(value.text);

const isClickTip = (value: unknown): value is TipClick =>
  isRecord(value) &&
  typeof value.selector === "string" &&
  isTipText(value.text);

const isSeasonTip = (value: unknown): value is TipSeason =>
  isRecord(value) && typeof value.date === "string" && isTipText(value.text);

const isTimeTip = (value: unknown): value is TipTime =>
  isRecord(value) && typeof value.hour === "string" && isTipText(value.text);

const isTipArray = <T>(
  value: unknown,
  validator: (item: unknown) => item is T,
): value is T[] => Array.isArray(value) && value.every(validator);

const isTipMessage = (value: unknown): value is TipMessage => {
  if (!isRecord(value)) {
    return false;
  }
  const optionalFields = ["default", "console", "copy", "visibilitychange"];
  return optionalFields.every((field) => {
    const nextValue = value[field];
    return nextValue === undefined || isTipText(nextValue);
  });
};

const isPartialTipConfig = (value: unknown): value is PartialTipConfig => {
  if (!isRecord(value)) {
    return false;
  }

  if (
    value.mouseover !== undefined &&
    !isTipArray(value.mouseover, isMouseoverTip)
  ) {
    return false;
  }
  if (value.click !== undefined && !isTipArray(value.click, isClickTip)) {
    return false;
  }
  if (value.seasons !== undefined && !isTipArray(value.seasons, isSeasonTip)) {
    return false;
  }
  if (value.time !== undefined && !isTipArray(value.time, isTimeTip)) {
    return false;
  }
  if (value.message !== undefined && !isTipMessage(value.message)) {
    return false;
  }

  return true;
};

export const isFullTipConfig = (value: unknown): value is TipConfig =>
  isRecord(value) &&
  isTipArray(value.mouseover, isMouseoverTip) &&
  isTipArray(value.click, isClickTip) &&
  isTipArray(value.seasons, isSeasonTip) &&
  isTipArray(value.time, isTimeTip) &&
  isTipMessage(value.message);

/**
 * 远程加载提示资源
 *
 * @param url
 * @returns
 */
export async function loadTipsResource(
  url?: string,
): Promise<PartialTipConfig | undefined> {
  if (!url) {
    return createEmptyTipConfig();
  }

  if (wasMissingTipsUrlCached(url)) {
    return;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        rememberMissingTipsUrl(url);
      }
      return;
    }
    const result: unknown = await response.json();
    if (!isPartialTipConfig(result)) {
      return;
    }
    return result;
  } catch {
    return;
  }
}
