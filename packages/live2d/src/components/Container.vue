<script setup lang="ts" name="Live2dContainer">
import { useLocalStorage } from "@vueuse/core";
import { computed, provide, readonly } from "vue";
import Live2dToggle from "./Toggle.vue";
import Live2dTip from "./Tip.vue";
import Live2d from "./Live2d.vue";
import Live2dTools from "./Tools.vue";
import type { Live2dPluginConfig } from "@/types";

const props = defineProps<{
  path: string;
  config: Live2dPluginConfig;
}>();

const defaultConfig: Live2dPluginConfig = {
  apiPath: "//api.zsq.im/live2d/",
  tools: ["hitokoto", "asteroids", "switch-model", "switch-texture", "photo", "info", "quit"],
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
  return !live2dHideTime.value || live2dHideTime.value + ONE_DAY_TIME > new Date().getTime();
});

const handleShowLive2d = () => {
  live2dHideTime.value = 0;
};

const handleHideLive2d = () => {
  live2dHideTime.value = new Date().getTime();
};
</script>
<template>
  <div class="live2d-container">
    <Live2dToggle v-if="!visibleLive2d" @click="handleShowLive2d" />
    <Transition name="plugin">
      <main v-if="visibleLive2d" class="live2d-main">
        <div class="tip-inner" :style="{ marginBottom: `-${(config.modelSize || 800) * 0.2}px` }">
          <Live2dTip></Live2dTip>
        </div>
        <Live2d :size="config.modelSize || 800" @close="handleHideLive2d" />
        <Live2dTools></Live2dTools>
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

.tip-inner {
  box-sizing: border-box;
  width: 100%;
  padding: 0 20px;
}
</style>
