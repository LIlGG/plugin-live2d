<script setup lang="ts" name="Live2dContainer">
import { useLocalStorage } from "@vueuse/core";
import { computed } from "vue";
import Live2dToggle from "./Toggle.vue";
import Live2d from "./Live2d.vue";

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
        <Live2d config="" @close="handleHideLive2d"/>
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
  background-color:aqua;
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
</style>
