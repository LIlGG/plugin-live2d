import { isNotEmptyString } from "../../utils/isString";
import { Tool } from "./tools";

declare global {
  interface Window {
    ASTEROIDSPLAYERS: unknown[];
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

  execute() {
    // @ts-ignore
    import("../../libs/asteroids.min.js").then((module) => {
      new module.default();
    });
  }
}
