<script setup lang="ts">
import eventBus from "@/libs/eventBus";
import type { Live2dPluginConfig } from "@/types";
import { useLocalStorage } from "@vueuse/core";
import { computed, inject, onMounted, ref, watch } from "vue";

const props = defineProps<{
  visible: boolean;
}>();

const visible = ref(props.visible);
const chatInput = ref();
const chatMessage = ref("");
const loading = ref(false);
const config = inject("config") as Live2dPluginConfig;

interface ChatMessage {
  role?: string;
  content?: string;
}

watch(
  () => props.visible,
  (value) => {
    visible.value = value;
  }
);

onMounted(() => {
  chatInput.value.focus();
});

chatInput.value.addEventListener("keyup", (e: KeyboardEvent) => {
  if (e.key === "Enter") {
    handleSendClick();
    return;
  }

  if (e.key === "Escape") {
    visible.value = false;
    return;
  }
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

const chatSendTipTimer = ref(0);
const historyMessages = useLocalStorage<ChatMessage[]>("historyMessages", []);

/**
 * 使用 openai 发送流式聊天消息
 *
 * @param {*} message 需要发送的消息
 */
const sendChatMessage = (message: string) => {
  loading.value = true;
  if (chatSendTipTimer.value) {
    clearTimeout(chatSendTipTimer.value);
    chatSendTipTimer.value = 0;
  }
  chatSendTipTimer.value = setTimeout(() => {
    eventBus.emit("showMessage", {
      text: "正在接收来自母星的消息，请耐心等待～",
      timeout: 2000,
      priority: 2,
    });
  }, 5000);
  const carryHistoryMessages = historyMessages.value.slice(-config.maxHistoryMessage);
  const userMessage = {
    role: "user",
    content: message,
  };
  carryHistoryMessages.push(userMessage);
  fetch("/apis/api.plugin.halo.run/v1alpha1/plugins/PluginLive2d/openai/chat-process", {
    method: "POST",
    cache: "no-cache",
    keepalive: true,
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      message: historyMessages,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        if (response.status === 401) {
          eventBus.emit("showMessage", {
            text: "请先登录后再进行聊天哦～",
            timeout: 2000,
            priority: 4,
          });
        } else {
          eventBus.emit("showMessage", {
            text: "母星的消息传输失败了呢，要不要再试一次？",
            timeout: 5000,
            priority: 4,
          });
        }
        console.log("get.message.error", response);
        return;
      }
      handleStreamMessage(response);
    })
    .finally(() => {
      loading.value = false;
      chatSendTipTimer.value = 0;
    });
};

const handleStreamMessage = (response: any) => {
  const sendMessage = ref("");
  const stop = ref(false);
  eventBus.emit("createStreamMessageTunnel", {
    timeout: (config.chunkTimeout || 60) * 1000,
    showTimeout: (config.showChatMessageTimeout || 10) * 1000,
    sendMessage: sendMessage,
    stop: stop,
  });
  let chatMessage = {
    content: "",
  } as ChatMessage;
  const reader = response.body.getReader();
  const textDecoder = new TextDecoder();
  while (true) {
    const { value, done } = reader.read();
    if (done) {
      break;
    }
    let text = textDecoder.decode(value);
    const textArrays = text.split("\n\n");
    textArrays.forEach((text) => {
      if (text.startsWith("data:")) {
        let dataIndex = text.indexOf("data:");
        if (dataIndex !== -1) {
          text = text.substring(dataIndex + 5);
        }
        try {
          let chunkJson = JSON.parse(text);
          if (chunkJson.choices.length > 0) {
            let choices = chunkJson.choices;
            choices.forEach((choice: any) => {
              if (choice.finish_reason === "stop") {
                historyMessages.value.push(chatMessage);
                stop.value = true;
              }

              if (!!choice.message.role) {
                chatMessage.role = choice.message.role;
              }

              if (!!choice.message.content) {
                chatMessage.content += choice.message.content;
                sendMessage.value = choice.message.content;
              }
            });
          }
        } catch (error) {
          console.log("get.message.error", error);
        }
      }
    });
    console.log("get.message", text);
  }
  stop.value = true;
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
<style>
.chat-enter-from,
.chat-leave-to {
  opacity: 0;
}

.chat-enter-active,
.chat-leave-active {
  transition: opacity 1s;
}

.chat-enter-to,
.chat-leave-from {
  opacity: 1;
}


.live2d-chat-model {
  position: fixed;
  right: 0;
  bottom: 30px;
  overflow: hidden;
  width: 100%;
}

.live2d-chat-model .live2d-chat-model-body {
  display: flex;
  height: 4vh;
  max-width: 30vw;
  background-color: #eff4f9;
  align-items: center;
  border-radius: 3px;
  margin: 0 auto;
}

.live2d-chat-model .live2d-chat-model-body .live2d-chat-content {
  height: 100%;
  width: 100%;
  padding: 5px 10px;
}

.live2d-chat-model .live2d-chat-model-body .live2d-chat-content input {
  outline: none;
  border: none;
  border: 0;
  height: 100%;
  width: 100%;
  background: white;
  padding: 5px;
  border-radius: 3px;
  font-size: 14px;
}

.live2d-chat-model .live2d-chat-model-body .live2d-chat-content input:focus {
  outline: none;
  border: 0;
}

.live2d-chat-model .live2d-chat-model-body .live2d-chat-send {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64%;
  width: 45px;
  background-color: #cecece;
  margin-right: 10px;
  border-radius: 3px;
  cursor: pointer;
}

.live2d-chat-model .live2d-chat-model-body .live2d-chat-send.active {
  background-color: #30cf79;
}

.live2d-chat-model .live2d-chat-model-body .live2d-chat-send.active:hover {
  background-color: #55bb8e;
}
</style>
