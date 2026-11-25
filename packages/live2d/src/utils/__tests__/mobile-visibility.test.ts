import { normalizeLive2dConfig } from "@/live2d/config/normalize-config";
import type { Live2dConfig } from "@/live2d/context/config-context";
import { describe, expect, it } from "vitest";
import { isMobileDevice, shouldShowLive2d } from "../mobile-visibility";

const desktop = {
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  platform: "MacIntel",
  maxTouchPoints: 0,
};

describe("mobile visibility", () => {
  it.each(["iPhone", "iPad", "iPod", "Android", "Windows Phone Mobile"])(
    "recognizes %s devices",
    (userAgent) => {
      const device = { ...desktop, userAgent };
      expect(isMobileDevice(device)).toBe(true);
      expect(shouldShowLive2d({ showOnMobile: false }, device)).toBe(false);
      expect(shouldShowLive2d({ showOnMobile: true }, device)).toBe(true);
    },
  );

  it("recognizes iPadOS with a desktop user agent", () => {
    expect(isMobileDevice({ ...desktop, maxTouchPoints: 5 })).toBe(true);
  });

  it("does not disable desktop devices, including touch screen PCs", () => {
    expect(shouldShowLive2d({ showOnMobile: false }, desktop)).toBe(true);
    expect(
      shouldShowLive2d(
        { showOnMobile: false },
        { ...desktop, platform: "Win32", maxTouchPoints: 10 },
      ),
    ).toBe(true);
  });

  it.each([undefined, null, "false", 0])(
    "keeps the default for missing or invalid configuration: %s",
    (showOnMobile) => {
      const config = normalizeLive2dConfig("/assets/", {
        showOnMobile: showOnMobile as Live2dConfig["showOnMobile"],
      });
      expect(config.showOnMobile).toBe(true);
      expect(
        shouldShowLive2d({ showOnMobile }, { ...desktop, userAgent: "iPhone" }),
      ).toBe(true);
    },
  );

  it("preserves an explicit false while normalizing configuration", () => {
    expect(
      normalizeLive2dConfig("/assets/", { showOnMobile: false }).showOnMobile,
    ).toBe(false);
  });
});
