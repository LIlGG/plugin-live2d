export const isNotEmpty = <T>(value: T[] | T | null | undefined): value is T[] | T => {
  return value !== null && value !== undefined && (Array.isArray(value) ? value.length > 0 :
    typeof value === 'string' ? value.trim() !== '' : true
  );
}