import { SendMessageEvent } from "@/live2d/events/send-message";
import {
  StreamMessageEvent,
  StreamMessageStartEvent,
  StreamMessageStopEvent,
} from "@/live2d/events/stream-message";
import { DraggableMixin } from "@/live2d/mixins/draggable";
import { LitElement, html } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Live2dTips } from "../Live2dTips";
import "../Live2dTips";

class DraggableTipsFixture extends DraggableMixin(LitElement, {
  storageKey: "tips-test",
  targetSelector: "#widget",
}) {
  render() {
    return html`<div id="widget"><live2d-tips></live2d-tips><div id="model">Model</div></div>`;
  }
}
customElements.define("draggable-tips-fixture", DraggableTipsFixture);

let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;

beforeEach(() => {
  vi.useFakeTimers();
  frames = new Map();
  nextFrame = 0;
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    }),
  );
  vi.stubGlobal(
    "cancelAnimationFrame",
    vi.fn((id: number) => frames.delete(id)),
  );
  vi.stubGlobal("innerWidth", 390);
  vi.stubGlobal("innerHeight", 844);
});

afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function createTips() {
  const tips = document.createElement("live2d-tips") as Live2dTips;
  document.body.append(tips);
  await tips.updateComplete;
  const content = tips.shadowRoot?.getElementById("live2d-tips");
  if (!content) throw new Error("Missing message content");
  return { tips, content };
}

function message(text: string, timeout = 10_000) {
  window.dispatchEvent(new SendMessageEvent({ text, timeout, priority: 10 }));
}

function startStream() {
  window.dispatchEvent(new StreamMessageStartEvent({ timeout: 60_000 }));
}

function flushFrames() {
  const pending = [...frames.values()];
  frames.clear();
  for (const callback of pending) callback(0);
}

describe("Live2dTips long messages", () => {
  it("keeps the complete message in a keyboard-accessible region while visible", async () => {
    const { tips, content } = await createTips();
    const text = "长回复内容。".repeat(160);
    message(text);
    await tips.updateComplete;
    expect(content.textContent?.trim()).toBe(text);
    expect(content.getAttribute("role")).toBe("region");
    expect(content.tabIndex).toBe(0);
    expect(content.classList.contains("pointer-events-auto")).toBe(true);
    expect(content.getAttribute("aria-hidden")).toBe("false");
  });

  it("disables interaction and releases focus when the message expires", async () => {
    const { tips, content } = await createTips();
    message("消息", 50);
    await tips.updateComplete;
    content.focus();
    expect(tips.shadowRoot?.activeElement).toBe(content);
    await vi.advanceTimersByTimeAsync(50);
    await tips.updateComplete;
    expect(content.tabIndex).toBe(-1);
    expect(content.classList.contains("pointer-events-none")).toBe(true);
    expect(content.getAttribute("aria-hidden")).toBe("true");
    expect(tips.shadowRoot?.activeElement).not.toBe(content);
  });

  it("follows appended output only while the reader remains at the end", async () => {
    const { tips, content } = await createTips();
    startStream();
    await tips.updateComplete;
    Object.defineProperty(content, "scrollHeight", {
      value: 1000,
      configurable: true,
    });
    Object.defineProperty(content, "clientHeight", { value: 200 });
    content.scrollTop = 800;
    window.dispatchEvent(new StreamMessageEvent({ text: "第一段" }));
    await tips.updateComplete;
    expect(content.scrollTop).toBe(1000);

    content.scrollTop = 100;
    content.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new StreamMessageEvent({ text: "第二段" }));
    await tips.updateComplete;
    expect(content.scrollTop).toBe(100);
    expect(content.textContent).toContain("第一段第二段");

    window.dispatchEvent(
      new StreamMessageEvent({ text: "新回复", mode: "replace" }),
    );
    await tips.updateComplete;
    expect(content.scrollTop).toBe(1000);
  });

  it("follows asynchronously loaded Markdown images unless the reader scrolls up", async () => {
    const { tips, content } = await createTips();
    startStream();
    window.dispatchEvent(
      new StreamMessageEvent({ text: "![图片](/sample.png)" }),
    );
    await tips.updateComplete;
    const image = content.querySelector("img");
    Object.defineProperty(content, "scrollHeight", {
      value: 1000,
      configurable: true,
    });
    Object.defineProperty(content, "clientHeight", { value: 200 });
    image?.dispatchEvent(new Event("load"));
    expect(content.scrollTop).toBe(1000);
    content.scrollTop = 100;
    content.dispatchEvent(new Event("scroll"));
    Object.defineProperty(content, "scrollHeight", { value: 2000 });
    image?.dispatchEvent(new Event("load"));
    expect(content.scrollTop).toBe(100);
  });

  it("makes hidden Markdown links inert and releases their focus", async () => {
    const { tips, content } = await createTips();
    startStream();
    window.dispatchEvent(
      new StreamMessageEvent({ text: "[链接](https://example.com)" }),
    );
    await tips.updateComplete;
    const link = content.querySelector("a");
    link?.focus();
    expect(tips.shadowRoot?.activeElement).toBe(link);
    window.dispatchEvent(new StreamMessageStopEvent({ showTimeout: 50 }));
    await vi.advanceTimersByTimeAsync(50);
    await tips.updateComplete;
    expect(content.hasAttribute("inert")).toBe(true);
    expect(tips.shadowRoot?.activeElement).not.toBe(link);
  });

  it("resets scrolling for a new ordinary message", async () => {
    const { tips, content } = await createTips();
    content.scrollTop = 200;
    message("新消息");
    await tips.updateComplete;
    expect(content.scrollTop).toBe(0);
  });

  it("keeps a displaced bubble inside the viewport and restores its model anchor", async () => {
    const { tips, content } = await createTips();
    const bounds = vi
      .spyOn(tips, "getBoundingClientRect")
      .mockReturnValue(new DOMRect(-30, -200, 220, 320));
    message("长回复");
    await tips.updateComplete;
    flushFrames();
    expect(tips.style.translate).toBe("42px 212px");
    expect(content.style.maxWidth).toBe("366px");

    bounds.mockReturnValue(new DOMRect(20, 400, 220, 320));
    window.dispatchEvent(new Event("resize"));
    flushFrames();
    expect(tips.style.translate).toBe("0px 0px");

    window.innerHeight = 500;
    window.dispatchEvent(new Event("resize"));
    flushFrames();
    expect(tips.style.translate).toBe("0px -232px");
  });

  it("cancels pending layout and removes viewport listeners on disconnect", async () => {
    const { tips } = await createTips();
    message("消息");
    await tips.updateComplete;
    expect(frames.size).toBe(1);
    tips.remove();
    expect(frames.size).toBe(0);
    window.dispatchEvent(new Event("resize"));
    expect(frames.size).toBe(0);
  });

  it("allows reading gestures inside the bubble without dragging the widget", async () => {
    const fixture = document.createElement(
      "draggable-tips-fixture",
    ) as DraggableTipsFixture;
    document.body.append(fixture);
    await fixture.updateComplete;
    const tips = fixture.shadowRoot?.querySelector("live2d-tips") as Live2dTips;
    await tips.updateComplete;
    const content = tips.shadowRoot?.getElementById("live2d-tips");
    const down = new MouseEvent("mousedown", {
      bubbles: true,
      composed: true,
      cancelable: true,
      button: 0,
    });
    content?.dispatchEvent(down);
    document.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 40, clientY: 40 }),
    );
    expect(down.defaultPrevented).toBe(false);
    expect(document.getElementById("live2d-drag-overlay")).toBeNull();

    const modelDown = new MouseEvent("mousedown", {
      bubbles: true,
      composed: true,
      cancelable: true,
      button: 0,
    });
    fixture.shadowRoot?.getElementById("model")?.dispatchEvent(modelDown);
    document.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 40, clientY: 40 }),
    );
    expect(modelDown.defaultPrevented).toBe(true);
    expect(document.getElementById("live2d-drag-overlay")).not.toBeNull();
    document.dispatchEvent(new MouseEvent("mouseup"));
  });
});
