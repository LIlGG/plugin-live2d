import { UnoLitElement } from "@/live2d/common/UnoLitElement";
import {
  type Live2dConfig,
  configContext,
} from "@/live2d/context/config-context";
import type { ModelLayoutEvent } from "@/live2d/events/model-layout";
import type { SendMessageEvent } from "@/live2d/events/send-message";
import type {
  StreamMessageEvent,
  StreamMessageStartEvent,
  StreamMessageStopEvent,
} from "@/live2d/events/stream-message";
import { isNotEmpty } from "@/live2d/utils/isNotEmpty";
import { randomSelection } from "@/live2d/utils/randomSelection";
import { consume } from "@lit/context";
import { type TemplateResult, html } from "lit";
import { property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

export class Live2dTips extends UnoLitElement {
  private static readonly DEFAULT_BOTTOM_OFFSET = 250;
  private static readonly MODEL_OVERLAP_OFFSET = 20;

  @consume({ context: configContext })
  @property({ attribute: false })
  public config?: Live2dConfig;

  @state()
  private _isShow = false;
  @state()
  private _message = "";
  @state()
  private _bottomOffset = Live2dTips.DEFAULT_BOTTOM_OFFSET;
  private priority = -1;
  private messageTimer: number | null = null;
  private streamInactivityTimeout = 60_000;
  // 流式消息模式标志
  private isStreamMode = false;
  private readonly onMessage = (event: Event) => {
    this.handleMessage(event as SendMessageEvent);
  };
  private readonly onStreamStart = (event: Event) => {
    this.handleStreamStart(event as StreamMessageStartEvent);
  };
  private readonly onStreamMessage = (event: Event) => {
    this.handleStreamMessage(event as StreamMessageEvent);
  };
  private readonly onStreamStop = (event: Event) => {
    this.handleStreamStop(event as StreamMessageStopEvent);
  };
  private readonly onModelLayout = (event: Event) => {
    this.handleModelLayout(event as ModelLayoutEvent);
  };

  constructor() {
    super();
    this._isShow = false;
    this._message = "";
  }

  render(): TemplateResult {
    const classes = {
      "animate-shake": true,
      "animate-delay-5s": true,
      "min-h-18": true,
      "w-63": true,
      "bg-tips": true,
      border: true,
      "border-tips": true,
      "border-solid": true,
      "rounded-xl": true,
      "shadow-tips": true,
      "text-size-sm": true,
      "overflow-hidden": true,
      "px-2.5": true,
      "py-1.5": true,
      "text-ellipsis": true,
      "transition-opacity-1000": true,
      "break-all": true,
      "opacity-100": this._isShow,
      "opacity-0": !this._isShow,
      "select-none": true,
    };
    return html`
      <div id="live2d-tips" class=${classMap(classes)}>
        ${unsafeHTML(this._message)}
      </div>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.applyHostPosition();
    window.addEventListener("live2d:send-message", this.onMessage);
    window.addEventListener("live2d:stream-message-start", this.onStreamStart);
    window.addEventListener("live2d:stream-message", this.onStreamMessage);
    window.addEventListener("live2d:stream-message-stop", this.onStreamStop);
    window.addEventListener("live2d:model-layout", this.onModelLayout);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("live2d:send-message", this.onMessage);
    window.removeEventListener(
      "live2d:stream-message-start",
      this.onStreamStart,
    );
    window.removeEventListener("live2d:stream-message", this.onStreamMessage);
    window.removeEventListener("live2d:stream-message-stop", this.onStreamStop);
    window.removeEventListener("live2d:model-layout", this.onModelLayout);
    this.clearMessageTimer();
  }

  handleMessage(e: SendMessageEvent): void {
    // 如果正在流式消息模式，忽略普通消息
    if (this.isStreamMode) {
      return;
    }
    const { text, timeout, priority } = e.detail;
    if (!isNotEmpty(text)) {
      return;
    }
    if (priority < this.priority) {
      return;
    }
    this.clearMessageTimer();
    const message = randomSelection(text);
    if (!isNotEmpty(message)) {
      return;
    }
    this.priority = priority;
    this._message = message;
    this._isShow = true;
    this.messageTimer = setTimeout(() => {
      this._isShow = false;
      this.priority = -1;
    }, timeout);
  }

  /**
   * 处理流式消息开始事件
   */
  handleStreamStart(e: StreamMessageStartEvent): void {
    const { timeout } = e.detail;
    const STREAM_PRIORITY = 99999;
    this.priority = STREAM_PRIORITY;
    this.isStreamMode = true;
    this.streamInactivityTimeout = timeout;

    // 清空消息并显示
    this._message = "";
    this._isShow = true;

    this.scheduleStreamInactivityTimeout(timeout);
  }

  /**
   * 处理流式消息片段事件 - 追加文本
   */
  handleStreamMessage(e: StreamMessageEvent): void {
    if (!this.isStreamMode) {
      return;
    }
    const { text } = e.detail;
    this.scheduleStreamInactivityTimeout(this.streamInactivityTimeout);
    if (e.detail.mode === "replace") {
      this._message = text;
      return;
    }
    this._message += text;
  }

  /**
   * 处理流式消息停止事件
   */
  handleStreamStop(e: StreamMessageStopEvent): void {
    if (!this.isStreamMode) {
      return;
    }
    const { showTimeout } = e.detail;

    this.clearMessageTimer();

    // 设置新的定时器，在指定时间后关闭
    this.messageTimer = setTimeout(() => {
      this._isShow = false;
      this.priority = -1;
      this.isStreamMode = false;
    }, showTimeout);
  }

  handleModelLayout(e: ModelLayoutEvent): void {
    const { topY, canvasHeight } = e.detail;
    this._bottomOffset = Math.round(
      canvasHeight - topY - Live2dTips.MODEL_OVERLAP_OFFSET,
    );
    this.applyHostPosition();
  }

  private applyHostPosition(): void {
    this.style.bottom = `${this._bottomOffset}px`;
  }

  private clearMessageTimer(): void {
    if (this.messageTimer) {
      clearTimeout(this.messageTimer);
      this.messageTimer = null;
    }
  }

  private scheduleStreamInactivityTimeout(timeout?: number): void {
    this.clearMessageTimer();
    this.messageTimer = setTimeout(
      () => {
        this._isShow = false;
        this.priority = -1;
        this.isStreamMode = false;
      },
      timeout ?? Number(this.config?.chunkTimeout || 60) * 1000,
    );
  }
}

customElements.define("live2d-tips", Live2dTips);
