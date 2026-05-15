import type { TipConfig } from "../context/config-context.ts";
import { isNotEmptyString } from "../utils/isString.ts";
import { isFullTipConfig, loadTipsResource } from "./loadTipsResource.ts";

export async function loadFullTipsResource(
  tipsPath: string | undefined,
  loadDefaultTips: () => Promise<TipConfig>,
): Promise<TipConfig> {
  if (isNotEmptyString(tipsPath)) {
    const tipsResult = await loadTipsResource(tipsPath);
    if (isFullTipConfig(tipsResult)) {
      return tipsResult;
    }
  }

  return loadDefaultTips();
}
