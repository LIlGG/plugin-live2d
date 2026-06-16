import {
  HALO_LIVE2D_CONFIG_ELEMENT_ID,
  readHaloLive2dConfig,
} from "./halo-config";

let bootstrapPromise: Promise<void> | undefined;

export const bootstrapFromHalo = async (): Promise<void> => {
  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = (async () => {
    const config = readHaloLive2dConfig();
    if (import.meta.env.DEV) {
      await import("@vitejs/plugin-react/preamble");
    }
    const { createLive2d } = await import("./live2d/runtime");
    const live2d = window.live2d ?? createLive2d();
    if (!window.live2d) {
      window.live2d = live2d;
    }
    live2d.init(config.assetPath, config);
  })();

  return bootstrapPromise;
};

if (
  typeof window !== "undefined" &&
  document.getElementById(HALO_LIVE2D_CONFIG_ELEMENT_ID)
) {
  void bootstrapFromHalo().catch((error) => {
    console.error("[PluginLive2d] Failed to bootstrap Live2D.", error);
  });
}
