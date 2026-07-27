export const COMPACT_VIEWPORT_QUERY = "(max-width: 767px)";
export const DESKTOP_LIVE2D_CANVAS_SIZE = 300;
export const COMPACT_LIVE2D_CANVAS_SIZE = 220;
export const COMPACT_MAX_DEVICE_PIXEL_RATIO = 1.5;

interface ViewportEnvironment {
  innerWidth: number;
  devicePixelRatio?: number;
  matchMedia?: (query: string) => Pick<MediaQueryList, "matches">;
}

export const isCompactViewport = (
  viewport: ViewportEnvironment = window,
): boolean => {
  if (viewport.matchMedia) {
    return viewport.matchMedia(COMPACT_VIEWPORT_QUERY).matches;
  }
  return viewport.innerWidth < 768;
};

export const getLive2dCanvasSize = (compactViewport: boolean): number =>
  compactViewport ? COMPACT_LIVE2D_CANVAS_SIZE : DESKTOP_LIVE2D_CANVAS_SIZE;

export const getLive2dToolsLayoutClass = (
  compactViewport: boolean,
  location?: string,
): string => {
  const edgeClass = location === "right" ? "mr-2" : "ml-2";
  const bottomClass = compactViewport ? "mb-3" : "mb-4";
  const visibilityClass = compactViewport
    ? "opacity-100"
    : "opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100";
  return `${bottomClass} ${edgeClass} z-2 ${visibilityClass}`;
};

export const getLive2dRenderResolution = (
  compactViewport: boolean,
  devicePixelRatio = window.devicePixelRatio || 1,
): number => {
  const resolution =
    Number.isFinite(devicePixelRatio) && devicePixelRatio > 0
      ? devicePixelRatio
      : 1;
  return compactViewport
    ? Math.min(resolution, COMPACT_MAX_DEVICE_PIXEL_RATIO)
    : resolution;
};
