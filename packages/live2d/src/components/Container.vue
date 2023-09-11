<script setup lang="ts" name="Live2dContainer">
import { useElementHover, useLocalStorage } from "@vueuse/core";
import { computed, provide, readonly, ref } from "vue";
import Live2dToggle from "./Toggle.vue";
import Live2dTip from "./Tip.vue";
import Live2d from "./Live2d.vue";
import Live2dTools from "@/components/tools/index.vue";
import type { Live2dPluginConfig } from "@/types";

const props = defineProps<{
  path: string;
  config: Live2dPluginConfig;
}>();

const defaultConfig: Live2dPluginConfig = {
  apiPath: "//api.zsq.im/live2d/",
  tools: ["openai", "hitokoto", "asteroids", "switch-model", "switch-texture", "photo", "info", "quit"],
  updateTime: new Date("2022.12.09").getUTCDate(),
  version: "1.0.1",
  modelSize: 600,
};

const config = computed(() => {
  const config = {
    ...defaultConfig,
    ...props.config,
  };
  config.tipsPath = props.path + config.tipsPath;
  return config;
});

provide("config", readonly(config.value));

// live2d 关闭时间，最多关闭一天
const ONE_DAY_TIME = 24 * 60 * 60 * 1000;
const live2dHideTime = useLocalStorage<number>("live2d-hide", 0);

const visibleLive2d = computed(() => {
  return !live2dHideTime.value || new Date().getTime() - live2dHideTime.value > ONE_DAY_TIME;
});

const handleShowLive2d = () => {
  live2dHideTime.value = 0;
};

const handleHideLive2d = () => {
  live2dHideTime.value = new Date().getTime();
  console.log("live2dHideTime", live2dHideTime.value);
};

const live2d = ref();
const isHovered = useElementHover(live2d);

const showTool = computed(() => {
  if (!config.value.tools) {
    return false;
  }

  if (config.value.tools.length === 0) {
    return false;
  }

  return isHovered.value;
});
</script>
<template>
  <div class="live2d-container">
    <Live2dToggle class="toggle-inner" v-if="!visibleLive2d" @click="handleShowLive2d" />
    <Transition name="plugin">
      <main v-if="visibleLive2d" class="live2d-main" ref="live2d">
        <div class="tip-inner">
          <Live2dTip></Live2dTip>
        </div>
        <Live2d :size="config.modelSize || 800" />
        <Transition name="tools">
          <div v-show="showTool" class="tools-inner">
            <Live2dTools @close="handleHideLive2d"></Live2dTools>
          </div>
        </Transition>
      </main>
    </Transition>
  </div>
</template>

<style>
.live2d-container {
  position: fixed;
  left: 0;
  bottom: 0;
}

.live2d-main {
  position: absolute;
  /* TODO: left or right */
  left: 0;
  bottom: 0;
  margin-bottom: -10px;
  line-height: 0;
  transform: translateY(3px);
  transition: transform 0.3s ease-in-out;
  background-color: aqua;
}

.live2d-main:hover {
  transform: translateY(0);
}

.plugin-enter-from,
.plugin-leave-to {
  bottom: -1000px;
}

.plugin-enter-active,
.plugin-leave-active {
  transition: bottom 3s ease-in-out;
}

.plugin-enter-to,
.plugin-leave-from {
  bottom: 0;
}

.toggle-inner {
  position: relative;
  left: 0;
  bottom: 66px;
}

.tip-inner {
  box-sizing: border-box;
  width: 100%;
  padding: 0 20px;
}

.tools-enter-from,
.tools-leave-to {
  opacity: 0;
}

.tools-enter-active,
.tools-leave-active {
  transition: opacity 1s;
}

.tools-enter-to,
.tools-leave-from {
  opacity: 1;
}

.tools-inner {
  position: absolute;
  right: -26px;
  bottom: 26px;
}
</style>
