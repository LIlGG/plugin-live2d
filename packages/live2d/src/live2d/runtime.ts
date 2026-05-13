import type { Live2dContext } from "@/live2d/components/Live2dContext";
import {
  type LegacyLive2dConfigInput,
  normalizeLive2dConfig,
} from "@/live2d/config/normalize-config";
import "@/live2d/components/Live2dContext";

const LIVE2D_CONTEXT_ID = "plugin-live2d-root";

declare global {
  interface Window {
    live2d?: Live2dRuntime;
  }
}

export class Live2dRuntime {
  private rootElement?: Live2dContext;

  init(path: string, config: LegacyLive2dConfigInput = {}): void {
    if (window.screen.width < 768) {
      return;
    }

    const rootElement = this.getOrCreateRoot();
    rootElement.config = normalizeLive2dConfig(path, config);
  }

  private getOrCreateRoot(): Live2dContext {
    if (this.rootElement?.isConnected) {
      return this.rootElement;
    }

    const existingRoot = document.getElementById(
      LIVE2D_CONTEXT_ID,
    ) as Live2dContext | null;
    if (existingRoot) {
      this.rootElement = existingRoot;
      return existingRoot;
    }

    const rootElement = document.createElement(
      "live2d-context",
    ) as Live2dContext;
    rootElement.id = LIVE2D_CONTEXT_ID;
    document.body.append(rootElement);
    this.rootElement = rootElement;
    return rootElement;
  }
}

export const createLive2d = (): Live2dRuntime => new Live2dRuntime();
