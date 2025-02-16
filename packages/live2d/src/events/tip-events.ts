import type { Live2dConfig, TipClick, TipConfig, TipMessage, TipMouseover, TipSeason, TipTime } from "../context/config-context";
import { dataWithinRange } from "../helpers/dateWithinRange";
import { getPluginTips } from "../helpers/getPluginTips";
import { loadTipsResource } from "../helpers/loadTipsResource";
import { mergeTips } from "../helpers/mergeTips";
import { sendMessage } from "../helpers/sendMessage";
import { timeWithinRange } from "../helpers/timeWithinRange";
import { isNotEmptyString, isString } from "../utils/isString";
import { randomSelection } from "../utils/randomSelection";
import { documentTitle, getReferrerDomain, hasWebsiteHome } from "../utils/util";

window.addEventListener("live2d:before-init", async (e) => {
  const config = e.detail.config;
  const tips = await _loadTips(config);
  if (!tips) {
    return;
  }
  _registerTipEventListener(config, tips);
})

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
  return domain ? `Hello！来自 <span>${domain}</span> 的朋友<br>${message}` : message;
}

const _welcomeEvent = (times: TipTime[]) => {
  const message = _getWelComeMessage(times);
  if (!message) {
    return;
  }
  sendMessage(message, 7000, 4);
}

const _holidayEvent = (seasons: TipSeason[]) => {
  for (const { date, text } of seasons) {
    if (dataWithinRange(date)) {
      window.dispatchEvent(
        new CustomEvent<Live2dAddDefaultMessageEventDetail>("live2d:add-default-message", {
          detail: {
            message: text,
          }
        })
      );
    }
  }
}

const _userLeaveEvent = (message: TipMessage) => {
  const { visibilitychange } = message;
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      sendMessage(visibilitychange, 6000, 2);
    }
  });
}

const _userCopyEvent = (message: TipMessage) => {
  const { copy } = message;
  window.addEventListener("copy", () => {
    sendMessage(copy, 6000, 2);
  });
}

const _userOpenConsoleEvent = (message: TipMessage) => {
  const { console } = message;
  const devtools = () => { };
  devtools.toString = () => {
    sendMessage(console, 6000, 2);
  };
}

const _userClickEvent = (clicks: TipClick[]) => {
  window.addEventListener("click", (event) => {
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
  });
}

const _userMouseoverEvent = (mouseovers: TipMouseover[]) => {
  window.addEventListener("mouseover", (event: MouseEvent) => {
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
  });
}

/**
 * 监听用户是否处于活动状态，如果用户长时间不活动，则向 Live2d 发送消息
 */
const _userActionEvent = (message: TipMessage) => {
  let userAction = false;
  let userActionTimer: number | undefined;
  const defaultMessage = message.default;
  const idleMessage: string[] = isString(defaultMessage) ? [defaultMessage] : (defaultMessage || []);

  window.addEventListener("mousemove", () => {
    userAction = true;
  });
  window.addEventListener("keydown", () => {
    userAction = true;
  });
  window.addEventListener("live2d:add-default-message", (ev) => {
    const message = ev.detail.message;
    if (Array.isArray(message)) {
      idleMessage.push(...message);
    } else {
      idleMessage.push(message);
    }
  })
  setInterval(() => {
    if (userAction) {
      userAction = false;
      clearInterval(userActionTimer);
      userActionTimer = undefined;
      return;
    }
    if (userActionTimer) {
      return;
    }
    userActionTimer = setInterval(() => {
      sendMessage(message.default, 6000, 2);
    }, 20000);
  }, 1000);
}

const _registerTipEventListener = (config: Live2dConfig, tips: TipConfig) => {
  // 首次进入页面时
  if (config.firstOpenSite) {
    _welcomeEvent(tips.time)
  }
  // 节日事件
  _holidayEvent(tips.seasons);
  // 用户是否活动事件
  _userActionEvent(tips.message);
  // 注册用户鼠标悬停事件
  _userMouseoverEvent(tips.mouseover);
  // 注册用户点击事件
  _userClickEvent(tips.click);
  // 用户打开控制台事件
  _userOpenConsoleEvent(tips.message);
  // 用户复制内容事件
  _userCopyEvent(tips.message);
  // 用户离开页面事件
  _userLeaveEvent(tips.message);
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
}

export const _getFullOrDefaultTips = async (config: Live2dConfig): Promise<TipConfig> => {
  // 获取插件文件中的全量 tips 文件
  if (isNotEmptyString(config?.tipsPath)) {
    const tipsResult = await loadTipsResource(config.tipsPath);
    if (tipsResult) {
      return tipsResult;
    }
  }
  // 获取默认的 tips 文件
  return (await import("../libs/live2d-tips.json")).default;
}
