<script setup lang="ts" name="Live2dTools">
import type { Live2dPluginConfig } from "@/types";
import { computed, inject, onMounted } from "vue";
import "@purge-icons/generated";
import eventBus from "@/libs/eventBus";

const config = inject("config") as Live2dPluginConfig;
declare const Live2D: any;

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

const emit = defineEmits(["close"]);

const defaultTools: Tool[] = [
  {
    name: "openai",
    icon: "ph-chats-circle-fill",
    title: "OpenAi",
    onClick: () => {
      
    },
  },
  {
    name: "hitokoto",
    icon: "ph-chat-circle-fill",
    title: "一言",
    onClick: () => {
      const api = config.hitokotoApi || "https://v1.hitokoto.cn";
      eventBus.emit("showHitokoto", {
        api: "https://v1.hitokoto.cn",
        callback: (result: any) => {
          return [
            result["hitokoto"],
            `这句一言来自 <span>「${result["from"]}」</span>，是 <span>${result["creator"]}</span> 在 hitokoto.cn 投稿的。`,
          ];
        },
      });
    },
  },
  {
    name: "asteroids",
    icon: "ph-paper-plane-tilt-fill",
    title: "小游戏",
    onClick: () => {
      import("@/libs/asteroids.min.js").then((m) => {
        new m.default();
      });
    },
  },
  {
    name: "switch-model",
    icon: "ph-arrows-counter-clockwise-fill",
    title: "模型",
    onClick: () => {
      eventBus.emit("loadOtherModel");
    },
  },
  {
    name: "switch-texture",
    icon: "ph-dress-fill",
    title: "材质",
    onClick: () => {
      eventBus.emit("loadModelTexture");
    },
  },
  {
    name: "photo",
    icon: "ph-camera-fill",
    title: "拍照",
    onClick: () => {
      const photoName = config.photoName || "live2d";
      eventBus.emit("showMessage", {
        text: "照好了嘛，是不是很可爱呢？",
        timeout: 6000,
        priority: 2,
      });
      Live2D.captureName = `${photoName}.png`;
      Live2D.captureFrame = true;
    },
  },
  {
    name: "info",
    icon: "ph-info-fill",
    title: "关于",
    onClick: () => {
      const siteUrl = "https://github.com/LIlGG/plugin-live2d";
      open(siteUrl);
    },
  },
  {
    name: "quit",
    icon: "ph-x-bold",
    title: "退出",
    onClick: () => {
      eventBus.emit("showMessage", {
        text: "愿你有一天能与重要的人重逢。",
        timeout: 2000,
        priority: 4,
      });
      setTimeout(() => {
        emit("close");
      }, 50);
    },
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
  <div class="live2d-tool">
    <template v-for="tool in tools" :key="tool.name">
      <span v-if="enableTools(tool.name)" @click="tool.onClick">
        <span
          :id="`live2d-tool-${tool.name}`"
          class="iconify"
          :data-icon="tool.icon"
          data-width="20"
          data-height="20"
        ></span>
      </span>
    </template>
  </div>
</template>

<style>
.live2d-tool {
  color: #aaa;
}

.live2d-tool span {
  display: block;
  margin-bottom: 6px;
  text-align: center;
}

.live2d-tool svg {
  color: #7b8c9d;
  cursor: pointer;
  height: 25px;
  transition: fill 0.3s;
}

.live2d-tool svg:hover {
  color: #0684bd; /* #34495e */
}
</style>
