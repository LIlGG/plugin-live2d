import type { Position } from "@/live2d/mixins/draggable";

const LIVE2D_POSITION_PREFIX = "live2d-position-";

/**
 * 获取元素的保存位置
 */
export const getSavedPosition = (key: string): Position | null => {
  try {
    const saved = localStorage.getItem(`${LIVE2D_POSITION_PREFIX}${key}`);
    if (saved) {
      return JSON.parse(saved) as Position;
    }
  } catch {
    // ignore parse errors
  }
  return null;
};

/**
 * 保存元素位置
 */
export const savePosition = (key: string, position: Position): void => {
  try {
    localStorage.setItem(`${LIVE2D_POSITION_PREFIX}${key}`, JSON.stringify(position));
  } catch {
    // ignore storage errors
  }
};

/**
 * 清除保存的位置
 */
export const clearPosition = (key: string): void => {
  try {
    localStorage.removeItem(`${LIVE2D_POSITION_PREFIX}${key}`);
  } catch {
    // ignore storage errors
  }
};

/**
 * 清除所有 live2d 位置信息
 */
export const clearAllPositions = (): void => {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(LIVE2D_POSITION_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore storage errors
  }
};
