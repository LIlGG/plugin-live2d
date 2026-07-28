import type { ToggleCanvasEvent } from "@/live2d/events/toggle-canvas";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Live2dToggle } from "../Live2dToggle";
import "../Live2dToggle";

describe("Live2dToggle mobile behavior", () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it("automatically opens the widget on mobile", async () => {
    const openStates: boolean[] = [];
    const onToggle = (event: Event) => {
      openStates.push((event as ToggleCanvasEvent).detail.isShow);
    };
    window.addEventListener("live2d:toggle-canvas", onToggle);

    const toggle = document.createElement("live2d-toggle") as Live2dToggle;
    document.body.append(toggle);
    await Promise.resolve();
    await toggle.updateComplete;

    expect(openStates).toEqual([true]);

    window.removeEventListener("live2d:toggle-canvas", onToggle);
  });
});
