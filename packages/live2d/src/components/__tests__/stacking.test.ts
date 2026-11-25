import { createDefaultLive2dConfig } from "@/live2d/config/default-config";
import { DEFAULT_LIVE2D_Z_INDEX } from "@/live2d/config/z-index";
import type { Live2dConfig } from "@/live2d/context/config-context";
import { ToggleCanvasEvent } from "@/live2d/events/toggle-canvas";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/live2d/components/Live2dCanvas", () => ({}));
vi.mock("@/live2d/components/Live2dTools", () => ({}));
vi.mock("@/live2d/components/Live2dTips", () => ({}));

import "../Live2dWidget";

type ConfiguredElement = HTMLElement & {
  config?: Live2dConfig;
  updateComplete: Promise<boolean>;
};

describe("Live2D stacking layers", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  it.each([undefined, 0, 30])(
    "keeps the widget, restore control and chat in order for layer %s",
    async (zIndex) => {
      const config = { ...createDefaultLive2dConfig(), zIndex };
      const widget = document.createElement(
        "live2d-widget",
      ) as ConfiguredElement;
      const toggle = document.createElement(
        "live2d-toggle",
      ) as ConfiguredElement;
      const chat = document.createElement(
        "live2d-chat-window",
      ) as ConfiguredElement;
      for (const element of [widget, toggle, chat]) {
        element.config = config;
        document.body.append(element);
      }
      window.dispatchEvent(new ToggleCanvasEvent({ isShow: true }));
      await Promise.all([
        widget.updateComplete,
        toggle.updateComplete,
        chat.updateComplete,
      ]);

      const base = zIndex ?? DEFAULT_LIVE2D_Z_INDEX;
      expect(
        widget.shadowRoot?.querySelector<HTMLElement>("#live2d-plugin")?.style
          .zIndex,
      ).toBe(String(base));
      expect(
        toggle.shadowRoot?.querySelector<HTMLElement>("#live2d-toggle")?.style
          .zIndex,
      ).toBe(String(base + 1));
      expect(
        chat.shadowRoot?.querySelector<HTMLElement>("#live2d-chat-model")?.style
          .zIndex,
      ).toBe(String(base + 2));
    },
  );
});
