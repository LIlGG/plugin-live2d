interface DeviceEnvironment {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
}

export const isMobileDevice = (
  device: DeviceEnvironment = navigator,
): boolean =>
  /Android|iPhone|iPad|iPod|Mobile/i.test(device.userAgent) ||
  // iPadOS can use a desktop user agent.
  (device.platform === "MacIntel" && device.maxTouchPoints > 1);

export const shouldShowLive2d = (
  config: { showOnMobile?: unknown },
  device: DeviceEnvironment = navigator,
): boolean => config.showOnMobile !== false || !isMobileDevice(device);
