import type {
  Live2dConfig,
  TipClick,
  TipConfig,
  TipMessage,
  TipMouseover,
  TipTime,
} from "@/live2d/context/config-context";
import {
  ADD_DEFAULT_MESSAGE_EVENT_NAME,
  type AddDefaultMessageEvent as AddDefaultMessageEventType,
} from "@/live2d/events/add-default-message";
import {
  BEFORE_INIT_EVENT_NAME,
  type BeforeInitEvent,
} from "@/live2d/events/before-init";
import { dataWithinRange } from "@/live2d/helpers/dateWithinRange";
import { getPluginTips } from "@/live2d/helpers/getPluginTips";
import { loadTipsResource } from "@/live2d/helpers/loadTipsResource";
import { mergeTips } from "@/live2d/helpers/mergeTips";
import { sendMessage } from "@/live2d/helpers/sendMessage";
import { timeWithinRange } from "@/live2d/helpers/timeWithinRange";
import { isNotEmptyString, isString } from "@/live2d/utils/isString";
import { randomSelection } from "@/live2d/utils/randomSelection";
import {
  documentTitle,
  getReferrerDomain,
  hasWebsiteHome,
} from "@/live2d/utils/util";
let activeTipEvents: TipEventController | undefined;

const _getWelComeMessage = (times: TipTime[]) => {
  if (hasWebsiteHome) {
    for (const { hour, text } of times) {
      if (timeWithinRange(hour)) {
        return text;
      }
    }
  }

  const message = `欢迎阅读<span>「${documentTitle}」</span>`;
  const domain = getReferrerDomain();
  return domain
    ? `Hello！来自 <span>${domain}</span> 的朋友<br>${message}`
    : message;
};

const _welcomeEvent = (times: TipTime[]) => {
  const message = _getWelComeMessage(times);
  if (!message) {
    return;
  }
  sendMessage(message, 7000, 4);
};

const _userLeaveEvent = (message: TipMessage, signal: AbortSignal) => {
  const { visibilitychange } = message;
  document.addEventListener(
    "visibilitychange",
    () => {
      if (!document.hidden) {
        sendMessage(visibilitychange, 6000, 2);
      }
    },
    { signal },
  );
};

const _userCopyEvent = (message: TipMessage, signal: AbortSignal) => {
  const { copy } = message;
  window.addEventListener(
    "copy",
    () => {
      sendMessage(copy, 6000, 2);
    },
    { signal },
  );
};

const _userOpenConsoleEvent = (message: TipMessage): number => {
  const { console } = message;
  let hasOpened = false;
  return window.setInterval(() => {
    const opened =
      window.outerWidth - window.innerWidth > 160 ||
      window.outerHeight - window.innerHeight > 160;
    if (opened && !hasOpened) {
      hasOpened = true;
      sendMessage(console, 6000, 2);
    } else if (!opened) {
      hasOpened = false;
    }
  }, 1000);
};

const _userClickEvent = (clicks: TipClick[], signal: AbortSignal) => {
  window.addEventListener(
    "click",
    (event) => {
      const path = event.composedPath();
      const target = path[0];
      if (!(target instanceof HTMLElement)) {
        return;
      }
      for (const { selector, text } of clicks) {
        if (!target.matches(selector)) {
          continue;
        }
        let message = randomSelection(text);
        if (!message) {
          continue;
        }
        message = message.replace("{text}", target.innerText);
        sendMessage(message, 4000, 1);
        return;
      }
    },
    { signal },
  );
};

const _userMouseoverEvent = (
  mouseovers: TipMouseover[],
  signal: AbortSignal,
) => {
  window.addEventListener(
    "mouseover",
    (event: MouseEvent) => {
      const path = event.composedPath();
      const target = path[0];
      if (!(target instanceof HTMLElement)) {
        return;
      }
      for (const { selector, text } of mouseovers) {
        if (!target.matches(selector)) {
          continue;
        }
        let message = randomSelection(text);
        if (!message) {
          continue;
        }
        message = message.replace("{text}", target.innerText);
        sendMessage(message, 4000, 1);
        return;
      }
    },
    { signal },
  );
};

/**
 * 监听用户是否处于活动状态，如果用户长时间不活动，则向 Live2d 发送消息
 */
const _userActionEvent = (
  message: TipMessage,
  signal: AbortSignal,
): {
  dispose: () => void;
  idleMessage: string[];
} => {
  let userAction = false;
  let idleTimer: number | undefined;
  const defaultMessage = message.default;
  const idleMessage: string[] = isString(defaultMessage)
    ? [defaultMessage]
    : [...(defaultMessage || [])];

  const markUserActive = () => {
    userAction = true;
  };

  window.addEventListener("mousemove", markUserActive, { signal });
  window.addEventListener("keydown", markUserActive, { signal });
  window.addEventListener(
    ADD_DEFAULT_MESSAGE_EVENT_NAME,
    (event) => {
      const nextMessage = (event as AddDefaultMessageEventType).detail.message;
      if (Array.isArray(nextMessage)) {
        idleMessage.push(...nextMessage);
        return;
      }
      idleMessage.push(nextMessage);
    },
    { signal },
  );

  const pollTimer = window.setInterval(() => {
    if (userAction) {
      userAction = false;
      if (idleTimer) {
        clearInterval(idleTimer);
        idleTimer = undefined;
      }
      return;
    }
    if (idleTimer) {
      return;
    }
    idleTimer = window.setInterval(() => {
      sendMessage(idleMessage, 6000, 2);
    }, 20000);
  }, 1000);

  return {
    idleMessage,
    dispose: () => {
      clearInterval(pollTimer);
      if (idleTimer) {
        clearInterval(idleTimer);
      }
    },
  };
};

class TipEventController {
  private readonly abortController = new AbortController();
  private readonly disposers: Array<() => void> = [];

  constructor(
    private readonly config: Live2dConfig,
    private readonly tips: TipConfig,
  ) {}

  start(): void {
    const { signal } = this.abortController;
    if (this.config.firstOpenSite) {
      _welcomeEvent(this.tips.time);
    }

    const userActionState = _userActionEvent(this.tips.message, signal);
    this.disposers.push(userActionState.dispose);

    for (const { date, text } of this.tips.seasons) {
      if (!dataWithinRange(date)) {
        continue;
      }
      const seasonalText = randomSelection(text);
      if (!seasonalText) {
        continue;
      }
      userActionState.idleMessage.push(
        seasonalText.replace("{year}", String(new Date().getFullYear())),
      );
    }

    _userMouseoverEvent(this.tips.mouseover, signal);
    _userClickEvent(this.tips.click, signal);

    if (this.config.openConsole) {
      const consoleTimer = _userOpenConsoleEvent(this.tips.message);
      this.disposers.push(() => clearInterval(consoleTimer));
    }
    if (this.config.copyContent) {
      _userCopyEvent(this.tips.message, signal);
    }
    if (this.config.backSite) {
      _userLeaveEvent(this.tips.message, signal);
    }
  }

  dispose(): void {
    this.abortController.abort();
    for (const disposer of this.disposers) {
      disposer();
    }
    this.disposers.length = 0;
  }
}

const _loadTips = async (config: Live2dConfig) => {
  if (!config) {
    return;
  }
  // 后台配置 tips，其中包含 mouseover 及 click 两种配置，以及单独配置的 message
  const pluginTips = getPluginTips(config);
  // 主题设置 tips，只会包含 mouseover 及 click 两种配置（会过滤掉其他配置）
  const themeTipsResult = await loadTipsResource(config.themeTipsPath);
  const themeTips: TipConfig = {
    click: themeTipsResult?.click || [],
    mouseover: themeTipsResult?.mouseover || [],
    seasons: [],
    time: [],
    message: {},
  };
  const fullOrDefaultTips = await _getFullOrDefaultTips(config);
  // 合并三种 tips
  return mergeTips({
    pluginTips,
    themeTips,
    fullOrDefaultTips,
  });
};

export const _getFullOrDefaultTips = async (
  config: Live2dConfig,
): Promise<TipConfig> => {
  // 获取插件文件中的全量 tips 文件
  if (isNotEmptyString(config?.tipsPath)) {
    const tipsResult = await loadTipsResource(config.tipsPath);
    if (tipsResult) {
      return tipsResult;
    }
  }
  // 获取默认的 tips 文件
  return (await import("../libs/live2d-tips.json")).default;
};

window.addEventListener(BEFORE_INIT_EVENT_NAME, async (event) => {
  const config = (event as BeforeInitEvent).detail.config;
  if (!config) {
    return;
  }

  const tips = await _loadTips(config);
  if (!tips) {
    return;
  }

  activeTipEvents?.dispose();
  activeTipEvents = new TipEventController(config, tips);
  activeTipEvents.start();
});
