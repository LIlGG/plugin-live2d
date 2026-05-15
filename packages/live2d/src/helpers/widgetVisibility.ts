export const LIVE2D_DISPLAY_STORAGE_KEY = "live2d-display";
export const LIVE2D_DISPLAY_SUPPRESSION_MS = 24 * 60 * 60 * 1000;

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "removeItem" | "setItem">;

export const isWidgetSuppressed = (
  hiddenAt: string | null,
  now = Date.now(),
): boolean => {
  if (!hiddenAt) {
    return false;
  }

  const parsed = Number.parseInt(hiddenAt, 10);
  return (
    Number.isFinite(parsed) && now - parsed <= LIVE2D_DISPLAY_SUPPRESSION_MS
  );
};

export const readWidgetSuppression = (
  storage: StorageReader,
  now = Date.now(),
): boolean => {
  return isWidgetSuppressed(storage.getItem(LIVE2D_DISPLAY_STORAGE_KEY), now);
};

export const rememberWidgetDismissal = (
  storage: StorageWriter,
  now = Date.now(),
): void => {
  storage.setItem(LIVE2D_DISPLAY_STORAGE_KEY, String(now));
};

export const clearWidgetDismissal = (storage: StorageWriter): void => {
  storage.removeItem(LIVE2D_DISPLAY_STORAGE_KEY);
};
