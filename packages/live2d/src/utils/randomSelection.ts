export const randomSelection = <T>(obj: T | T[]): T | undefined => {
  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return undefined;
    }
    return obj[Math.floor(Math.random() * obj.length)];
  }
  return obj;
};