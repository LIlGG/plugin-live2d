import { normalizeLive2dConfig } from "@/live2d/config/normalize-config";
import {
  DEFAULT_LIVE2D_Z_INDEX,
  MAX_LIVE2D_Z_INDEX,
} from "@/live2d/config/z-index";
import { describe, expect, it } from "vitest";

describe("Live2D stacking configuration", () => {
  it("preserves the existing layer when an older configuration has no setting", () => {
    expect(normalizeLive2dConfig("/assets/", {}).zIndex).toBe(
      DEFAULT_LIVE2D_Z_INDEX,
    );
  });

  it.each([0, 10, MAX_LIVE2D_Z_INDEX])(
    "accepts the configured integer %s, including zero",
    (zIndex) => {
      expect(normalizeLive2dConfig("/assets/", { zIndex }).zIndex).toBe(zIndex);
    },
  );

  it("accepts a numeric string from the saved Halo JSON", () => {
    const input = JSON.parse('{"zIndex":"25"}');
    expect(normalizeLive2dConfig("/assets/", input).zIndex).toBe(25);
  });

  it.each([null, "", -1, 1.5, "invalid", MAX_LIVE2D_Z_INDEX + 1])(
    "falls back for an invalid saved value %s",
    (zIndex) => {
      const input = JSON.parse(JSON.stringify({ zIndex }));
      expect(normalizeLive2dConfig("/assets/", input).zIndex).toBe(
        DEFAULT_LIVE2D_Z_INDEX,
      );
    },
  );
});
