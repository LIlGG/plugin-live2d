import {
  COMPACT_WIDGET_DRAWER_DURATION_MS,
  WIDGET_DRAWER_DURATION_MS,
  getWidgetDrawerDuration,
} from "@/live2d/helpers/widgetDrawer";
import { describe, expect, it } from "vitest";
import {
  COMPACT_LIVE2D_CANVAS_SIZE,
  DESKTOP_LIVE2D_CANVAS_SIZE,
  getLive2dCanvasSize,
  getLive2dRenderResolution,
  getLive2dToolsLayoutClass,
  isCompactViewport,
} from "../responsive";

describe("responsive Live2D presentation", () => {
  it("uses matchMedia when it is available", () => {
    expect(
      isCompactViewport({
        innerWidth: 1200,
        matchMedia: () => ({ matches: true }),
      }),
    ).toBe(true);
  });

  it("falls back to viewport width", () => {
    expect(isCompactViewport({ innerWidth: 767 })).toBe(true);
    expect(isCompactViewport({ innerWidth: 768 })).toBe(false);
  });

  it("uses a smaller canvas on compact viewports", () => {
    expect(getLive2dCanvasSize(true)).toBe(COMPACT_LIVE2D_CANVAS_SIZE);
    expect(getLive2dCanvasSize(false)).toBe(DESKTOP_LIVE2D_CANVAS_SIZE);
  });

  it("caps high-density mobile rendering without changing desktop DPR", () => {
    expect(getLive2dRenderResolution(true, 3)).toBe(1.5);
    expect(getLive2dRenderResolution(true, 1)).toBe(1);
    expect(getLive2dRenderResolution(false, 3)).toBe(3);
    expect(getLive2dRenderResolution(true, Number.NaN)).toBe(1);
  });

  it("uses a shorter drawer animation on compact viewports", () => {
    expect(getWidgetDrawerDuration(true)).toBe(
      COMPACT_WIDGET_DRAWER_DURATION_MS,
    );
    expect(getWidgetDrawerDuration(false)).toBe(WIDGET_DRAWER_DURATION_MS);
  });

  it("shows desktop tools only while the widget is hovered or focused", () => {
    const layoutClass = getLive2dToolsLayoutClass(false, "left");
    expect(layoutClass).toContain("opacity-0");
    expect(layoutClass).toContain("group-hover:opacity-100");
    expect(layoutClass).toContain("group-focus-within:opacity-100");
  });

  it("keeps the mobile drawer trigger permanently visible", () => {
    const layoutClass = getLive2dToolsLayoutClass(true, "right");
    expect(layoutClass).toContain("opacity-100");
    expect(layoutClass).not.toContain("opacity-0");
    expect(layoutClass).not.toContain("group-hover:opacity-100");
  });
});
