export const WIDGET_DRAWER_HIDDEN_BOTTOM = "-500px";
export const WIDGET_DRAWER_VISIBLE_BOTTOM = "0px";
export const WIDGET_DRAWER_DURATION_MS = 4000;
export const COMPACT_WIDGET_DRAWER_DURATION_MS = 500;

export const getWidgetDrawerDuration = (compactViewport: boolean): number =>
  compactViewport
    ? COMPACT_WIDGET_DRAWER_DURATION_MS
    : WIDGET_DRAWER_DURATION_MS;
