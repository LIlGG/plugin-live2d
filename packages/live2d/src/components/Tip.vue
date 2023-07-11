<script setup lang="ts" name="Live2dTip">
import type { Live2dPluginConfig, Message, Selector, Time, Tip } from "@/types";
import { computed, inject, onMounted, ref } from "vue";
import { distinctArray, loadTipsResource, randomSelection } from "@/utils";
import eventBus from "@/libs/eventBus";
import { useSessionStorage } from "@vueuse/core";

const config = inject("config") as Live2dPluginConfig;
onMounted(() => {
  loadTips().then((tips: Tip) => {
    registerEventListener(tips);
  });
});

/**
 * 注册事件监听
 *
 * @param tips
 */
const registerEventListener = (tips: Tip) => {
  // 检测用户活动状态，并在空闲时显示消息
  let userAction = false;
  let userActionIntervalId = 0;
  let messageArray = tips.message?.default as string[];
  window.addEventListener("mousemove", () => (userAction = true));
  window.addEventListener("keydown", () => (userAction = true));
  setInterval(() => {
    if (userAction) {
      userAction = false;
      clearInterval(userActionIntervalId);
      userActionIntervalId = 0;
    } else if (!userActionIntervalId) {
      userActionIntervalId = setInterval(() => {
        eventBus.emit("showMessage", {
          text: messageArray,
          timeout: 6000,
          priority: 2,
        });
      }, 20000);
    }
  }, 1000);
  // 首次进入网站触发事件
  if (config.firstOpenSite === true && tips.time) {
    const welcomeMessage = getWelcomeMessage(tips.time);
    if (welcomeMessage) {
      eventBus.emit("showMessage", {
        text: welcomeMessage,
        timeout: 7000,
        priority: 4,
      });
    }
  }
  window.addEventListener("mouseover", (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    for (let { selector, text } of tips.mouseover) {
      if (!target || !target.matches(selector)) {
        continue;
      }
      let messageText = randomSelection(text);
      messageText = messageText.replace("{text}", target.innerText);
      eventBus.emit("showMessage", {
        text: messageText,
        timeout: 4000,
        priority: 1,
      });
      return;
    }
  });
  window.addEventListener("click", (event: Event) => {
    const target = event.target as HTMLElement;
    for (let { selector, text } of tips.click) {
      if (!target || !target.matches(selector)) {
        continue;
      }
      let messageText = randomSelection(text);
      messageText = messageText.replace("{text}", target.innerText);
      eventBus.emit("showMessage", {
        text: messageText,
        timeout: 4000,
        priority: 1,
      });
      return;
    }
  });

  tips.seasons?.forEach(({ date, text }) => {
    const now = new Date(),
      after = date.split("-")[0],
      before = date.split("-")[1] || after;
    if (
      Number(after.split("/")[0]) <= now.getMonth() + 1 &&
      now.getMonth() + 1 <= Number(before.split("/")[0]) &&
      Number(after.split("/")[1]) <= now.getDate() &&
      now.getDate() <= Number(before.split("/")[1])
    ) {
      let messageText = randomSelection(text);
      messageText = messageText.replace("{year}", now.getFullYear());
      messageArray.push(messageText);
    }
  });

  // 打开控制台事件
  if (config.openConsole === true) {
    let devtools = () => {};
    devtools.toString = () => {
      eventBus.emit("showMessage", {
        text: config.openConsoleTip || tips.message?.console || "",
        timeout: 6000,
        priority: 2,
      });
    };
  }
  // 复制内容触发事件
  if (config.copyContent === true) {
    window.addEventListener("copy", () => {
      eventBus.emit("showMessage", {
        text: config.copyContentTip || tips.message?.copy || "",
        timeout: 6000,
        priority: 2,
      });
    });
  }
  // 离开当前页面事件
  if (config.backSite === true) {
    window.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        eventBus.emit("showMessage", {
          text: config.backSiteTip || tips.message?.visibilitychange || "",
          timeout: 6000,
          priority: 2,
        });
      }
    });
  }
};

const loadTips = (): Promise<Tip> => {
  return new Promise((resolve) => {
    Promise.all([loadTipsResource(config.themeTipsPath), loadTipsResource(config.tipsPath)]).then((result) => {
      // 后台配置 tips，其中包含 mouseover 及 click 两种配置，以及单独配置的 message
      let configTips = backendConfigConvert();
      // 主题设置 tips，其中包含 mouseover 及 click 两种配置（会过滤掉其他配置）
      let themeTips: Tip = {
        click: result[0]["click"] || [],
        mouseover: result[0]["mouseover"] || [],
      } as {
        click: Selector[];
        mouseover: Selector[];
      };
      // 配置的 tips 文件，包含所有属性 （click, mouseover, seasons, time, message）
      let allTips = result[1];
      // 若配置的 tips 文件不存在，则回退到默认 tips
      if (Object.keys(allTips).length === 0) {
        import("../data/live2d-tips.json").then((tips: Tip) => {
          resolve(mergeTips(configTips, themeTips, tips));
        });
      } else {
        resolve(mergeTips(configTips, themeTips, allTips));
      }
    });
  });
};

/**
 * 合并 tips 文件
 */
const backendConfigConvert = () => {
  let tips = {
    click: [],
    mouseover: [],
    message: {},
  } as {
    click: Selector[];
    mouseover: Selector[];
    message: Message;
  };

  if (!!config.selectorTips) {
    config.selectorTips.forEach((item) => {
      let texts = item.messageTexts.map((text) => text.message);
      let obj = {
        selector: item.selector,
        text: texts,
      } as Selector;
      if (item.mouseAction === "click") {
        tips.click.push(obj);
      } else {
        tips.mouseover.push(obj);
      }
    });
  }
  tips.message.visibilitychange = config.backSiteTip;
  tips.message.copy = config.copyContentTip;
  tips.message.console = config.openConsoleTip;
  return tips;
};

/**
 * 合并各个渠道的 tips，根据获取位置不同，合并时优先级也不同。优先级按高到低的顺序为
 *
 * <ul>
 *   <ol>后台插件配置文件中获得的 tips。（该配置文件只支持 mouseover 与 click 两种类型的 tips 属性，另外包括单独配置的 message）</ol>
 *   <ol>主题文件中设置的 tips （该配置文件只支持 mouseover 与 click 两种类型的 tips 属性）</ol>
 *   <ol>配置/默认的 tips 文件（该配置文件支持所有的 tips 属性，但其属性会被优先级高的覆盖）</ol>
 * </ul>
 *
 * 请注意，此项返回值为修改后的 defaultTips，任何修改 defaultTips 的情况都将导致返回值同步修改。
 *
 * @param configTips 后台配置文件中设置的 tips
 * @param themeTips 主题提供的 tips
 * @param defaultTips 配置/默认的 tips
 */
const mergeTips = (configTips: Tip, themeTips: Tip, defaultTips: Tip): Tip => {
  let mergeTip = {
    mouseover: defaultTips.mouseover,
    click: defaultTips.click,
    seasons: defaultTips.seasons,
    time: defaultTips.time,
    message: defaultTips.message,
  } as Tip;
  let duplicateClick = [...configTips["click"], ...themeTips["click"], ...defaultTips["click"]];
  let duplicateMouseover = [...configTips["mouseover"], ...themeTips["mouseover"], ...defaultTips["mouseover"]];
  mergeTip.click = distinctArray(duplicateClick, "selector");
  mergeTip.mouseover = distinctArray(duplicateMouseover, "selector");
  mergeTip.message = { ...defaultTips.message, ...configTips.message };
  return mergeTip;
};

const live2dMessageText = ref<string>("");
const messageTimer = ref<number>(0);
const showMessage = computed(() => {
  console.log(!!live2dMessageText.value, !!messageTimer.value)
  return !!live2dMessageText.value && !!messageTimer.value;
});

const live2dPriority = useSessionStorage("live2dPriority", 0);

const getWelcomeMessage = (time: Time[]): string | string[] => {
  // 如果是主页
  if (location.pathname === "/") {
    for (let { hour, text } of time) {
      const now = new Date(),
        after = Number(hour.split("-")[0]),
        before = Number(hour.split("-")[1] || after);
      if (after <= now.getHours() && now.getHours() <= before) {
        return text;
      }
    }
  }
  const text = `欢迎阅读<span>「${document.title.split(" - ")[0]}」</span>`;
  let from;
  // referrer 内获取的网页
  const domains = {
    baidu: "百度",
    so: "360搜索",
    google: "谷歌搜索",
  } as {
    [key: string]: string;
  };
  if (document.referrer !== "") {
    const referrer = new URL(document.referrer),
      domain = referrer.hostname.split(".")[1];
    if (location.hostname === referrer.hostname) return text;
    if (domain in domains) {
      from = domains[domain];
    } else {
      from = referrer.hostname;
    }
    return `Hello！来自 <span>${from}</span> 的朋友<br>${text}`;
  }
  return text;
};

const resetMessage = (time: number) => {
  clearTimeout(messageTimer.value);
  messageTimer.value = 0;
  messageTimer.value = setTimeout(() => {
    live2dPriority.value = 0;
    messageTimer.value = 0;
  }, time);
};

const sendMessage = (text: string, timeout: number, priority: number) => {
  if (!text) {
    return;
  }
  if (priority < live2dPriority.value) {
    return;
  }

  live2dPriority.value = priority;
  live2dMessageText.value = randomSelection(text);
  resetMessage(timeout);
};

/**
 * 显示消息至消息栏
 *
 * @param text 需要显示的消息
 * @param timeout 消息展示时间（最大）
 * @param priority 消息优先级，数字越大，优先级越大
 */
eventBus.on("showMessage", (message) => {
  sendMessage(message.text, message.timeout, message.priority);
});

/**
 * 创建一个流式效果的消息框。
 * 此消息框的优先级将大于所有其他消息框优先级，且不会被其他消息覆盖。
 *
 * @param timeout 等待消息流的最大时间，超过此时间将自动关闭流消息框
 * @param showTimeout 消息全部接受完之后，展示时长
 */
eventBus.on("createStreamMessage", (message) => {
  const priority = 999;
  live2dPriority.value = priority;
  resetMessage(message.timeout);

  message.sendMessage = (text: string) => {
    live2dMessageText.value += text;
  };

  message.stop = () => {
    resetMessage(message.showTimeout);
  };
});

eventBus.on("showHitokoto", (hitokoto) => {
  loadTipsResource(hitokoto.api).then((result: any) => {
    let text = hitokoto.callback(result);
    if (typeof text === "string") {
      sendMessage(text, 6000, 2);
    } else {
      sendMessage(text[0], 6000, 2);
      if (text[1] !== undefined) {
        setTimeout(() => {
          sendMessage(text[1], 4000, 2);
        }, 6000);
      }
    }
  });
});
</script>
<template>
  <Transition name="tips">
    <div class="live2d-tips" v-show="showMessage">{{ live2dMessageText }}</div>
  </Transition>
</template>
<style scoped>
.tips-enter-from,
.tips-leave-to {
  opacity: 0;
}

.tips-enter-active,
.tips-leave-active {
  transition: opacity 0.2s;
}

.tips-enter-to,
.tips-leave-from {
  opacity: 1;
}

.live2d-tips {
  animation: shake 50s ease-in-out 5s infinite;
  background-color: rgba(236, 217, 188, 0.5);
  border: 1px solid rgba(224, 186, 140, 0.62);
  border-radius: 12px;
  box-shadow: 0 3px 15px 2px rgba(191, 158, 118, 0.2);
  font-size: 14px;
  line-height: 24px;
  min-height: 70px;
  overflow: hidden;
  padding: 5px 10px;
  text-overflow: ellipsis;
  transition: opacity 1s;
  word-break: break-all;
  box-sizing: border-box;
  width: 100%;
}

@keyframes shake {
  2% {
    transform: translate(0.5px, -1.5px) rotate(-0.5deg);
  }

  4% {
    transform: translate(0.5px, 1.5px) rotate(1.5deg);
  }

  6% {
    transform: translate(1.5px, 1.5px) rotate(1.5deg);
  }

  8% {
    transform: translate(2.5px, 1.5px) rotate(0.5deg);
  }

  10% {
    transform: translate(0.5px, 2.5px) rotate(0.5deg);
  }

  12% {
    transform: translate(1.5px, 1.5px) rotate(0.5deg);
  }

  14% {
    transform: translate(0.5px, 0.5px) rotate(0.5deg);
  }

  16% {
    transform: translate(-1.5px, -0.5px) rotate(1.5deg);
  }

  18% {
    transform: translate(0.5px, 0.5px) rotate(1.5deg);
  }

  20% {
    transform: translate(2.5px, 2.5px) rotate(1.5deg);
  }

  22% {
    transform: translate(0.5px, -1.5px) rotate(1.5deg);
  }

  24% {
    transform: translate(-1.5px, 1.5px) rotate(-0.5deg);
  }

  26% {
    transform: translate(1.5px, 0.5px) rotate(1.5deg);
  }

  28% {
    transform: translate(-0.5px, -0.5px) rotate(-0.5deg);
  }

  30% {
    transform: translate(1.5px, -0.5px) rotate(-0.5deg);
  }

  32% {
    transform: translate(2.5px, -1.5px) rotate(1.5deg);
  }

  34% {
    transform: translate(2.5px, 2.5px) rotate(-0.5deg);
  }

  36% {
    transform: translate(0.5px, -1.5px) rotate(0.5deg);
  }

  38% {
    transform: translate(2.5px, -0.5px) rotate(-0.5deg);
  }

  40% {
    transform: translate(-0.5px, 2.5px) rotate(0.5deg);
  }

  42% {
    transform: translate(-1.5px, 2.5px) rotate(0.5deg);
  }

  44% {
    transform: translate(-1.5px, 1.5px) rotate(0.5deg);
  }

  46% {
    transform: translate(1.5px, -0.5px) rotate(-0.5deg);
  }

  48% {
    transform: translate(2.5px, -0.5px) rotate(0.5deg);
  }

  50% {
    transform: translate(-1.5px, 1.5px) rotate(0.5deg);
  }

  52% {
    transform: translate(-0.5px, 1.5px) rotate(0.5deg);
  }

  54% {
    transform: translate(-1.5px, 1.5px) rotate(0.5deg);
  }

  56% {
    transform: translate(0.5px, 2.5px) rotate(1.5deg);
  }

  58% {
    transform: translate(2.5px, 2.5px) rotate(0.5deg);
  }

  60% {
    transform: translate(2.5px, -1.5px) rotate(1.5deg);
  }

  62% {
    transform: translate(-1.5px, 0.5px) rotate(1.5deg);
  }

  64% {
    transform: translate(-1.5px, 1.5px) rotate(1.5deg);
  }

  66% {
    transform: translate(0.5px, 2.5px) rotate(1.5deg);
  }

  68% {
    transform: translate(2.5px, -1.5px) rotate(1.5deg);
  }

  70% {
    transform: translate(2.5px, 2.5px) rotate(0.5deg);
  }

  72% {
    transform: translate(-0.5px, -1.5px) rotate(1.5deg);
  }

  74% {
    transform: translate(-1.5px, 2.5px) rotate(1.5deg);
  }

  76% {
    transform: translate(-1.5px, 2.5px) rotate(1.5deg);
  }

  78% {
    transform: translate(-1.5px, 2.5px) rotate(0.5deg);
  }

  80% {
    transform: translate(-1.5px, 0.5px) rotate(-0.5deg);
  }

  82% {
    transform: translate(-1.5px, 0.5px) rotate(-0.5deg);
  }

  84% {
    transform: translate(-0.5px, 0.5px) rotate(1.5deg);
  }

  86% {
    transform: translate(2.5px, 1.5px) rotate(0.5deg);
  }

  88% {
    transform: translate(-1.5px, 0.5px) rotate(1.5deg);
  }

  90% {
    transform: translate(-1.5px, -0.5px) rotate(-0.5deg);
  }

  92% {
    transform: translate(-1.5px, -1.5px) rotate(1.5deg);
  }

  94% {
    transform: translate(0.5px, 0.5px) rotate(-0.5deg);
  }

  96% {
    transform: translate(2.5px, -0.5px) rotate(-0.5deg);
  }

  98% {
    transform: translate(-1.5px, -1.5px) rotate(-0.5deg);
  }

  0%,
  100% {
    transform: translate(0, 0) rotate(0);
  }
}
</style>
