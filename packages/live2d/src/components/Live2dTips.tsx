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
import {
  hasMarkdownBlockElements,
  renderMarkdown,
} from "@/live2d/helpers/renderMarkdown";
import { isNotEmpty } from "@/live2d/utils/isNotEmpty";
import { randomSelection } from "@/live2d/utils/randomSelection";
import { consume } from "@lit/context";
import { type PropertyValues, type TemplateResult, html } from "lit";
import { property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

export class Live2dTips extends UnoLitElement {
  private static readonly DEFAULT_BOTTOM_OFFSET = 250;
  private static readonly MODEL_OVERLAP_OFFSET = 20;
  private static readonly OPACITY_TRANSITION_MS = 1000;
  private static readonly VIEWPORT_MARGIN = 12;

  @consume({ context: configContext })
  @property({ attribute: false })
  public config?: Live2dConfig;

  @property({ type: Boolean })
  public compact = false;

  @state()
  private _isShow = false;
  @state()
  private _message = "";
  @state()
  private _bottomOffset = Live2dTips.DEFAULT_BOTTOM_OFFSET;
  private priority = -1;
  private messageTimer: number | null = null;
  private streamModeResetTimer: number | null = null;
  private streamInactivityTimeout = 60_000;
  private followStream = false;
  private positionFrame?: number;
  private resizeObserver?: ResizeObserver;
  private positionObserver?: MutationObserver;
  // 流式消息模式标志
  @state()
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
    const renderedMessage = this.isStreamMode
      ? renderMarkdown(this._message)
      : this._message;
    const isMarkdownBlock =
      this.isStreamMode && hasMarkdownBlockElements(renderedMessage);
    const classes = {
      "animate-shake": true,
      "animate-delay-5s": true,
      "min-h-18": true,
      "box-border": true,
      "bg-tips": true,
      border: true,
      "border-tips": true,
      "border-solid": true,
      "rounded-xl": true,
      "shadow-tips": true,
      "text-size-sm": true,
      "live2d-tips-content": true,
      "px-2.5": true,
      "py-1.5": true,
      "transition-opacity-1000": true,
      "break-all": true,
      "live2d-tips-markdown": isMarkdownBlock,
      "opacity-100": this._isShow,
      "opacity-0": !this._isShow,
      "pointer-events-auto": this._isShow,
      "pointer-events-none": !this._isShow,
    };
    const width = this.compact
      ? "min(220px, calc(100vw - 1rem))"
      : "min(15.75rem, calc(100vw - 1rem))";
    return html`
      <div
        id="live2d-tips"
        class=${classMap(classes)}
        style="width: ${width};"
        role="region"
        aria-label="看板娘消息"
        aria-hidden=${!this._isShow}
        tabindex=${this._isShow ? 0 : -1}
        ?inert=${!this._isShow}
        @scroll=${this.handleContentScroll}
      >
        ${unsafeHTML(renderedMessage)}
      </div>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.style.zIndex = "2";
    this.applyHostPosition();
    window.addEventListener("live2d:send-message", this.onMessage);
    window.addEventListener("live2d:stream-message-start", this.onStreamStart);
    window.addEventListener("live2d:stream-message", this.onStreamMessage);
    window.addEventListener("live2d:stream-message-stop", this.onStreamStop);
    window.addEventListener("live2d:model-layout", this.onModelLayout);
    window.addEventListener("resize", this.schedulePosition);
    window.visualViewport?.addEventListener("resize", this.schedulePosition);
    window.visualViewport?.addEventListener("scroll", this.schedulePosition);
    this.shadowRoot?.addEventListener("load", this.handleContentLoad, true);
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(this.schedulePosition);
      this.resizeObserver.observe(this);
    }
    const root = this.getRootNode();
    const widget =
      root instanceof ShadowRoot ? root.getElementById("live2d-plugin") : null;
    if (widget) {
      this.resizeObserver?.observe(widget);
      this.positionObserver = new MutationObserver(this.schedulePosition);
      this.positionObserver.observe(widget, {
        attributes: true,
        attributeFilter: ["style", "class"],
      });
    }
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
    this.clearStreamModeResetTimer();
    window.removeEventListener("resize", this.schedulePosition);
    window.visualViewport?.removeEventListener("resize", this.schedulePosition);
    window.visualViewport?.removeEventListener("scroll", this.schedulePosition);
    this.shadowRoot?.removeEventListener("load", this.handleContentLoad, true);
    this.resizeObserver?.disconnect();
    this.positionObserver?.disconnect();
    if (this.positionFrame !== undefined) {
      window.cancelAnimationFrame(this.positionFrame);
      this.positionFrame = undefined;
    }
  }

  protected updated(changed: PropertyValues): void {
    super.updated(changed);
    const content = this.shadowRoot?.getElementById("live2d-tips");
    if (content && changed.has("_message") && this.followStream) {
      content.scrollTop = content.scrollHeight;
    }
    const focused = this.shadowRoot?.activeElement;
    if (
      !this._isShow &&
      focused instanceof HTMLElement &&
      content?.contains(focused)
    ) {
      focused.blur();
    }
    this.schedulePosition();
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
    this.clearStreamModeResetTimer();
    const message = randomSelection(text);
    if (!isNotEmpty(message)) {
      return;
    }
    this.priority = priority;
    this.followStream = false;
    const content = this.shadowRoot?.getElementById("live2d-tips");
    if (content) content.scrollTop = 0;
    this.isStreamMode = false;
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
    this.clearStreamModeResetTimer();
    this.priority = STREAM_PRIORITY;
    this.isStreamMode = true;
    this.followStream = true;
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
    if (e.detail.mode === "replace") this.followStream = true;
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
      this.scheduleStreamModeReset();
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
    this.schedulePosition();
  }

  private readonly handleContentScroll = (event: Event): void => {
    const content = event.currentTarget as HTMLElement;
    this.followStream =
      content.scrollHeight - content.scrollTop - content.clientHeight <= 24;
  };

  private readonly handleContentLoad = (): void => {
    const content = this.shadowRoot?.getElementById("live2d-tips");
    if (content && this._isShow && this.isStreamMode && this.followStream) {
      content.scrollTop = content.scrollHeight;
    }
    this.schedulePosition();
  };

  private readonly schedulePosition = (): void => {
    if (!this.isConnected || !this._isShow || this.positionFrame !== undefined)
      return;
    this.positionFrame = window.requestAnimationFrame(() => {
      this.positionFrame = undefined;
      this.keepInViewport();
    });
  };

  private keepInViewport(): void {
    const content = this.shadowRoot?.getElementById("live2d-tips");
    if (!content || !this.isConnected || !this._isShow) return;
    const viewport = window.visualViewport;
    const width = viewport?.width ?? window.innerWidth;
    const height = viewport?.height ?? window.innerHeight;
    const left = (viewport?.offsetLeft ?? 0) + Live2dTips.VIEWPORT_MARGIN;
    const top = (viewport?.offsetTop ?? 0) + Live2dTips.VIEWPORT_MARGIN;
    content.style.maxWidth = `${Math.max(0, width - 2 * Live2dTips.VIEWPORT_MARGIN)}px`;
    content.style.maxHeight = `min(20rem, ${Math.max(0, height - 2 * Live2dTips.VIEWPORT_MARGIN)}px)`;
    // Measure the model's original anchor again so dragging back restores it.
    this.style.translate = "0px 0px";
    const rect = this.getBoundingClientRect();
    const x = Math.max(
      left,
      Math.min(
        rect.left,
        left + width - 2 * Live2dTips.VIEWPORT_MARGIN - rect.width,
      ),
    );
    const y = Math.max(
      top,
      Math.min(
        rect.top,
        top + height - 2 * Live2dTips.VIEWPORT_MARGIN - rect.height,
      ),
    );
    this.style.translate = `${x - rect.left}px ${y - rect.top}px`;
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
        this.scheduleStreamModeReset();
      },
      timeout ?? Number(this.config?.chunkTimeout || 60) * 1000,
    );
  }

  private scheduleStreamModeReset(): void {
    this.clearStreamModeResetTimer();
    this.streamModeResetTimer = setTimeout(() => {
      this.isStreamMode = false;
      this.streamModeResetTimer = null;
    }, Live2dTips.OPACITY_TRANSITION_MS);
  }

  private clearStreamModeResetTimer(): void {
    if (this.streamModeResetTimer) {
      clearTimeout(this.streamModeResetTimer);
      this.streamModeResetTimer = null;
    }
  }
}

customElements.define("live2d-tips", Live2dTips);
