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

  it("removes a root mounted by another runtime and reuses one root after enabling", () => {
    const firstRuntime = createLive2d();
    const secondRuntime = createLive2d();
    firstRuntime.init("/assets/", { showOnMobile: true });

    secondRuntime.init("/assets/", { showOnMobile: false });
    expect(document.getElementById("plugin-live2d-root")).toBeNull();
    expect(localStorage.getItem(LIVE2D_DISPLAY_STORAGE_KEY)).toBe("12345");

    secondRuntime.init("/assets/", { showOnMobile: true });
    const enabledRoot = document.getElementById("plugin-live2d-root");
    firstRuntime.init("/assets/", { showOnMobile: true });
    expect(document.getElementById("plugin-live2d-root")).toBe(enabledRoot);
    expect(document.querySelectorAll("#plugin-live2d-root")).toHaveLength(1);
    expect(localStorage.getItem(LIVE2D_DISPLAY_STORAGE_KEY)).toBe("12345");
  });

  it("removes the connected root when its cached root has been detached", () => {
    const runtime = createLive2d();
    runtime.init("/assets/", { showOnMobile: true });
    const cachedRoot = document.getElementById("plugin-live2d-root");
    cachedRoot?.remove();
    createLive2d().init("/assets/", { showOnMobile: true });
    expect(document.getElementById("plugin-live2d-root")).not.toBe(cachedRoot);

    runtime.init("/assets/", { showOnMobile: false });
    expect(document.getElementById("plugin-live2d-root")).toBeNull();
    expect(localStorage.getItem(LIVE2D_DISPLAY_STORAGE_KEY)).toBe("12345");

    runtime.init("/assets/", { showOnMobile: true });
    expect(document.querySelectorAll("#plugin-live2d-root")).toHaveLength(1);
  });

  it("mounts a desktop widget regardless of the mobile setting", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Windows NT 10.0");
    createLive2d().init("/assets/", { showOnMobile: false });
    const desktopRoot = document.getElementById("plugin-live2d-root");
    expect(desktopRoot).not.toBeNull();
    createLive2d().init("/assets/", { showOnMobile: false });
    expect(document.getElementById("plugin-live2d-root")).toBe(desktopRoot);
    expect(document.querySelectorAll("#plugin-live2d-root")).toHaveLength(1);
    expect(localStorage.getItem(LIVE2D_DISPLAY_STORAGE_KEY)).toBe("12345");
  });
});
