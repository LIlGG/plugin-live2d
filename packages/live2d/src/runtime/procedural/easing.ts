export type EasingFunction = (t: number) => number;

export const linear: EasingFunction = (t) => t;

export const easeIn: EasingFunction = (t) => t * t;

export const easeOut: EasingFunction = (t) => 1 - (1 - t) * (1 - t);

export const easeInOut: EasingFunction = (t) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export const easeOutSpring: EasingFunction = (t) => {
  // Critically damped spring approximation
  const c4 = (2 * Math.PI) / 3;
  return t === 0
    ? 0
    : t === 1
      ? 1
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

export function getEasing(name: string): EasingFunction {
  switch (name) {
    case "linear":
      return linear;
    case "easeIn":
      return easeIn;
    case "easeOut":
      return easeOut;
    case "easeInOut":
      return easeInOut;
    case "spring":
    case "easeOutSpring":
      return easeOutSpring;
    default:
      return easeOut;
  }
}
