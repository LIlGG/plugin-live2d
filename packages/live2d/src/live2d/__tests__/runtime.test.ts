import { LIVE2D_DISPLAY_STORAGE_KEY } from "@/live2d/helpers/widgetVisibility";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLive2d } from "../runtime";

vi.mock("@/live2d/components/Live2dContext", () => ({}));

describe("runtime mobile visibility", () => {
  beforeEach(() => {
    document.body.replaceChildren();
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("iPhone");
    localStorage.setItem(LIVE2D_DISPLAY_STORAGE_KEY, "12345");
  });

  afterEach(() => {
    document.body.replaceChildren();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("does not mount a disabled mobile widget or change user preferences", () => {
    createLive2d().init("/assets/", { showOnMobile: false });
    expect(document.getElementById("plugin-live2d-root")).toBeNull();
    expect(localStorage.getItem(LIVE2D_DISPLAY_STORAGE_KEY)).toBe("12345");
  });

  it("removes an existing root when reinitialized with mobile display disabled", () => {
    const runtime = createLive2d();
    runtime.init("/assets/", { showOnMobile: true });
    expect(document.getElementById("plugin-live2d-root")).not.toBeNull();
    runtime.init("/assets/", { showOnMobile: false });
    expect(document.getElementById("plugin-live2d-root")).toBeNull();
    runtime.init("/assets/", { showOnMobile: true });
    expect(document.querySelectorAll("#plugin-live2d-root")).toHaveLength(1);
  });

  it("mounts a desktop widget regardless of the mobile setting", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Windows NT 10.0");
    createLive2d().init("/assets/", { showOnMobile: false });
    expect(document.getElementById("plugin-live2d-root")).not.toBeNull();
  });
});
