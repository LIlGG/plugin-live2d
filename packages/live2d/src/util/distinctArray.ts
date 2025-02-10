export const distinctArray = <T extends { [key: string]: unknown }>(arr: T[], key: string) => {
  const map = new Map();
  for (const item of arr) {
    map.set(item[key], item);
  }
  return [...map.values()];
}