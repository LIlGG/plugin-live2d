const SEPARATOR = "-";

/**
 * 判断当前是否在指定时间范围内。
 * 
 * @param hour 指定的时间范围格式为 `HH-HH`。
 * @returns 如果当前时间在指定范围内则返回 true， 否则返回 false。
 */
export const timeWithinRange = (hour: string): boolean => {
  const spiltTime = hour.split(SEPARATOR);
  const now = new Date();
  const after = Number.parseInt(spiltTime[0]);
  const before = Number.parseInt(spiltTime[1]) || after;


  if (after < 0 || before > 23 || after > before) {
    throw new Error("时间范围不正确");
  }

  if (after <= now.getHours() && now.getHours() <= before) {
    return true;
  }
  return false;
}