import { pickNumber } from "@/live2d/config/normalize-helpers";

export const DEFAULT_LIVE2D_Z_INDEX = 9998;
export const MAX_LIVE2D_Z_INDEX = 2147483645;

export const normalizeLive2dZIndex = (value: unknown): number => {
  const zIndex = pickNumber(value);
  return zIndex !== undefined &&
    Number.isInteger(zIndex) &&
    zIndex >= 0 &&
    zIndex <= MAX_LIVE2D_Z_INDEX
    ? zIndex
    : DEFAULT_LIVE2D_Z_INDEX;
};
