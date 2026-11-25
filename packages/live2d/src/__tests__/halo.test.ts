import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { loadRuntime, createLive2d, init } = vi.hoisted(() => {
  const init = vi.fn();
  return {
    init,
    loadRuntime: vi.fn(),
    createLive2d: vi.fn(() => ({ init })),
  };
});

vi.mock("@vitejs/plugin-react/preamble", () => ({}));

describe("Halo mobile visibility bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.doMock("../live2d/runtime", () => {
      loadRuntime();
      return { createLive2d };
    });
    document.body.replaceChildren();
    window.live2d = undefined;
  });

  afterEach(() => {
    document.body.replaceChildren();
    window.live2d = undefined;
    vi.restoreAllMocks();
  });

  it.each([
    ["iPhone", false, false],
    ["Android", true, true],
    ["iPhone", undefined, true],
    ["iPhone", "false", true],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64)", false, true],
  ])(
    "bootstraps %s with showOnMobile=%s: %s",
    async (userAgent, showOnMobile, expected) => {
      vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
      const config = {
        assetPath: "/plugins/PluginLive2d/assets/static/",
        showOnMobile,
      };
      const configElement = document.createElement("script");
      configElement.id = "plugin-live2d-config";
      configElement.type = "application/json";
      configElement.textContent = JSON.stringify(config);
      document.body.append(configElement);

      const { bootstrapFromHalo } = await import("../halo");
      await bootstrapFromHalo();
      // Repeat callers must not load or initialize a second runtime.
      await bootstrapFromHalo();

      expect(loadRuntime).toHaveBeenCalledTimes(expected ? 1 : 0);
      expect(createLive2d).toHaveBeenCalledTimes(expected ? 1 : 0);
      expect(init).toHaveBeenCalledTimes(expected ? 1 : 0);
      if (expected) {
        expect(init).toHaveBeenCalledWith(
          config.assetPath,
          JSON.parse(JSON.stringify(config)),
        );
      } else {
        expect(window.live2d).toBeUndefined();
        expect(document.getElementById("plugin-live2d-root")).toBeNull();
      }
    },
  );
});
