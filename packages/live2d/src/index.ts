import { defineCustomElement } from "vue";
import Live2d from "@/components/Live2d.vue";

const Live2dElement = defineCustomElement(Live2d);

document.body.appendChild(
  new Live2dElement({
    // 初始化 props（可选）
  })
)