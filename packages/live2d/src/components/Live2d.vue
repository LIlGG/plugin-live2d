<script setup lang="ts">
import type { Live2dPluginConfig } from "@/types";
import { onMounted, ref } from "vue";
import type { ModelReturn } from "./model/type"

const props = defineProps<{
  config: Live2dPluginConfig;
}>();

const model = ref<ModelReturn>();

onMounted(() => {
  import("./model").then((m) => {
    model.value = m.useLive2dModel("");
  });
});
</script>
<template>
  <div id="live2d-tips"></div>
  <canvas id="live2d" width="800" height="800"></canvas>
  <div id="live2d-tool"></div>
</template>
<style></style>