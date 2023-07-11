<script setup lang="ts" name="Live2dTools">
import type { Live2dPluginConfig } from "@/types";
import { computed, inject, onMounted } from "vue";

const config = inject("config") as Live2dPluginConfig;

export interface Tool {
  name: string;
  icon: string;
  title?: string;
  onClick: () => void;
}

const props = withDefaults(
  defineProps<{
    tools: Tool[];
  }>(),
  {
    tools: undefined,
  }
);

const defaultTools: Tool[] = [
  {
    name: "openai",
    icon: "ph-chats-circle-fill",
    title: "OpenAi",
    onClick: () => {},
  },
  {
    name: "hitokoto",
    icon: "ph-chat-circle-fill",
    title: "一言",
    onClick: () => {},
  },
  {
    name: "asteroids",
    icon: "ph-paper-plane-tilt-fill",
    title: "小游戏",
    onClick: () => {},
  },
  {
    name: "switch-model",
    icon: "ph-arrows-counter-clockwise-fill",
    title: "模型",
    onClick: () => {},
  },
  {
    name: "switch-texture",
    icon: "ph-dress-fill",
    title: "材质",
    onClick: () => {},
  },
  {
    name: "photo",
    icon: "ph-camera-fill",
    title: "拍照",
    onClick: () => {},
  },
  {
    name: "info",
    icon: "ph-info-fill",
    title: "关于",
    onClick: () => {},
  },
  {
    name: "quit",
    icon: "ph-x-bold",
    title: "退出",
    onClick: () => {},
  },
];

const tools = computed<Tool[]>(() => {
  return [...defaultTools, ...(props.tools || [])];
});

const enableTools = (name: string): boolean => {
  if (config.tools?.includes(name)) {
    return true;
  }
  return false;
};

onMounted(() => {});
</script>
<template>
  <div id="live2d-tool">
    <template v-for="tool in tools" :key="tool.name">
      <span v-if="enableTools(tool.name)" :id="`live2d-tool-${tool.name}`">
        <i class="iconify" :data-icon="tool.icon" data-width="20" data-height="20"></i>
      </span>
    </template>
  </div>
</template>
