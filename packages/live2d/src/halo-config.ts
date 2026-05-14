import type { LegacyLive2dConfigInput } from "@/live2d/config/normalize-config";

export const HALO_LIVE2D_CONFIG_ELEMENT_ID = "plugin-live2d-config";

export interface HaloLive2dConfig extends LegacyLive2dConfigInput {
  assetPath: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const readHaloLive2dConfig = (
  documentRoot: Document = document,
): HaloLive2dConfig => {
  const configElement = documentRoot.getElementById(
    HALO_LIVE2D_CONFIG_ELEMENT_ID,
  );
  if (!configElement) {
    throw new Error("Missing Halo Live2D config element.");
  }

  const configText = configElement.textContent?.trim();
  if (!configText) {
    throw new Error("Halo Live2D config payload is empty.");
  }

  const parsedConfig: unknown = JSON.parse(configText);
  if (!isRecord(parsedConfig) || typeof parsedConfig.assetPath !== "string") {
    throw new Error("Halo Live2D config payload is invalid.");
  }

  return parsedConfig as HaloLive2dConfig;
};
