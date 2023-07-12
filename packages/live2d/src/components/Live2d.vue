<script setup lang="ts">
import type { Live2dPluginConfig } from "@/types";
import { inject, onMounted, ref } from "vue";
import type { ModelReturn } from "./model/type";
import { useLocalStorage } from "@vueuse/core";
import eventBus from "@/libs/eventBus";

const props = defineProps<{
  size: number;
}>();

const config = inject("config") as Live2dPluginConfig;

const model = ref<ModelReturn>();

eventBus.on("loadOtherModel", () => {
  model.value?.switchModel();
});

eventBus.on("loadModelTexture", () => {
  model.value?.loadModelTexture();
});

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
  <canvas id="live2d" :width="props.size" :height="props.size"></canvas>
</template>
<style>
#live2d {
  cursor: grab;
}

#live2d:active {
  cursor: grabbing;
}
</style>
