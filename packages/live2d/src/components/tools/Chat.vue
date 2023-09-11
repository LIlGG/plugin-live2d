<script setup lang="ts">
import eventBus from "@/libs/eventBus";
import { computed, nextTick, onMounted, ref } from "vue";

const chatInput = ref();
const chatMessage = ref("");
const loading = ref(false);

const emit = defineEmits(["close"]);

onMounted(() => {
  nextTick(() => {
    console.log(chatInput.value);
    chatInput.value.focus();
    chatInput.value.addEventListener("keyup", (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSendClick();
        return;
      }

      if (e.key === "Escape") {
        emit("close");
        return;
      }
    });
  });
});

const handleInputFocus = () => {
  eventBus.emit("showMessage", {
    text: ["按下回车键可以快速发送消息哦！", "要不要试试按下回车键呢？"],
    timeout: 2000,
    priority: 1,
  });
};

const handleSendClick = () => {
  const message = chatMessage.value;
  if (message.length > 0 && !loading.value) {
    chatInput.value = "";
    sendChatMessage(message);
  }
};

/**
 * 使用 openai 发送流式聊天消息
 *
 * @param {*} message 需要发送的消息
 */
const sendChatMessage = (message: string) => {
  loading.value = true;
  eventBus.emit("showMessage", {
    text: "正在接收来自母星的消息，请耐心等待～",
    timeout: 2000,
    priority: 2,
  });
};

const sendDisable = computed(() => {
  return loading.value || chatMessage.value.length === 0;
});
</script>
<template>
  <div id="live2d-chat-model">
    <div class="live2d-chat-model-body">
      <div class="live2d-chat-content">
        <input
          ref="chatInput"
          id="live2d-chat-input"
          @focus="handleInputFocus"
          v-model="chatMessage"
          type="text"
          required
          autofocus="true"
        />
      </div>
      <span id="live2d-chat-send" @click="handleSendClick" :disabled="sendDisable">
        <span
          class="iconify"
          v-show="!loading"
          data-icon="mingcute:send-plane-fill"
          data-width="20"
          data-height="20"
          style="color: white"
        ></span>
        <span
          class="iconify"
          v-show="loading"
          data-icon="line-md:loading-twotone-loop"
          data-width="20"
          data-height="20"
          style="color: white; display: none"
        ></span>
      </span>
    </div>
  </div>
</template>
