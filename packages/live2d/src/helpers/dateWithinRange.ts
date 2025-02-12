const RANGE_SEPARATOR = '-';
const DATE_SEPARATOR = '/';

/**
 * 检查指定的日期是否在当前日期范围内。
 * 
 * @param date 指定的日期格式为 `MM/DD` 或 `MM/DD-MM/DD`。
 * @returns 如果日期在当前范围内则返回 true， 否则返回 false。
 */
export const dataWithinRange = (date: string): boolean => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentDate = now.getDate();

  const [startDate, endDate = startDate] = date.split(RANGE_SEPARATOR);

  const [startMonth, startDay] = startDate.split(DATE_SEPARATOR).map(Number);
  const [endMonth, endDay] = endDate.split(DATE_SEPARATOR).map(Number);

  return (
    startMonth <= currentMonth &&
    currentMonth <= endMonth &&
    startDay <= currentDate &&
    currentDate <= endDay
  );
}
