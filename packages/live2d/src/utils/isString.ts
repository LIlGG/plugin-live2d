export const isString = (value: unknown): value is string => {
  return typeof value === "string";
}

export const isNotEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.length > 0;
};