import { Tool } from "@/live2d/live2d/tools/tools";
import { isNotEmptyString } from "@/live2d/utils/isString";

declare global {
  interface Window {
    ASTEROIDSPLAYERS: unknown[];
    Asteroids?: new () => unknown;
  }
}

/**
 * 小宇宙小游戏工具
 */
export class AsteroidsTool extends Tool {
  priority = 80;
  icon() {
    const icon = this.getConfig().asteroidsIcon;
    return isNotEmptyString(icon) ? icon : "ph-paper-plane-tilt-fill";
  }

  name(): string {
    return "asteroids";
  }

  execute() {
    if (typeof window.Asteroids === "function") {
      if (!Array.isArray(window.ASTEROIDSPLAYERS)) {
        window.ASTEROIDSPLAYERS = [];
      }
      window.ASTEROIDSPLAYERS.push(new window.Asteroids());
      return;
    }

    void import("@/live2d/libs/asteroids.min.js");
  }
}
