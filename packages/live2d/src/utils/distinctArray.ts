import type { ObjectAny } from "../context/config-context";

export const distinctArray = <T extends ObjectAny>(arr: T[], key: keyof T) => {
  const map = new Map<unknown, T>();
  for (const item of arr) {
    map.set(item[key], item);
  }
  return [...map.values()];
}