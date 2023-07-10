<script setup lang="ts">
import { useLocalStorage } from "@vueuse/core";
import { computed } from "vue";

const [live2dHide, setLive2dHide] = useLocalStorage<number>("live2d-hide", undefined);

const visibleLive2d = computed(() => {
  return !(live2dHide || (live2dHide - new Date().getTime() > 0));
});

</script>
<template>
  <div id="live2d-toggle">
    <span>看板娘</span>
  </div>
  
</template>
