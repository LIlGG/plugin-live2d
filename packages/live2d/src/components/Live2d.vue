<script setup lang="ts">
import type { Live2dPluginConfig } from "@/types";
import { inject, onMounted, ref } from "vue";
import type { ModelReturn } from "./model/type";
import { useLocalStorage } from "@vueuse/core";

const config = inject("config") as Live2dPluginConfig;

const model = ref<ModelReturn>();

onMounted(() => {
  import("./model").then((m) => {
    model.value = m.useLive2dModel(config.apiPath || "");
    initModel();
  });
});

const modelId = useLocalStorage<number>("modelId", config.modelId || 1);
const modelTexturesId = useLocalStorage<number>("modelTexturesId", config.modelTexturesId || 53);

const initModel = () => {
  model.value?.loadModel(modelId.value, modelTexturesId.value);
};
</script>
<template>
  <canvas id="live2d" width="800" height="800"></canvas>
</template>
<style></style>
