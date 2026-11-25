import { SendMessageEvent } from "@/live2d/events/send-message";
import {
  StreamMessageEvent,
  StreamMessageStartEvent,
  StreamMessageStopEvent,
} from "@/live2d/events/stream-message";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Live2dTips } from "../Live2dTips";
import "../Live2dTips";

const createTips = async () => {
  const tips = document.createElement("live2d-tips") as Live2dTips;
  document.body.append(tips);
  await tips.updateComplete;
  return tips;
};

const getMessage = (tips: Live2dTips) => {
  const message = tips.shadowRoot?.querySelector<HTMLElement>("#live2d-tips");
  if (!message) {
    throw new Error("Live2dTips did not render its message container");
  }
  return message;
};

const sendMessage = async (tips: Live2dTips, text: string) => {
  window.dispatchEvent(
    new SendMessageEvent({ text, timeout: 60_000, priority: 1 }),
  );
  await tips.updateComplete;
  return getMessage(tips);
};

const streamMessage = async (tips: Live2dTips, text: string) => {
  window.dispatchEvent(new StreamMessageStartEvent({ timeout: 60_000 }));
  window.dispatchEvent(new StreamMessageEvent({ text }));
  await tips.updateComplete;
  return getMessage(tips);
};

describe("Live2dTips message rendering", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.useRealTimers();
  });

  it.each([
    '<iframe src="about:blank" srcdoc="<script>alert(1)</script>"></iframe>',
    '<img src="invalid" onerror="alert(1)">',
    '<svg onload="alert(1)"><a href="javascript:alert(1)">svg</a></svg>',
    '<form><input autofocus onfocus="alert(1)"></form>',
    "<script>alert(1)</script>",
  ])("does not mount active HTML in ordinary messages: %s", async (text) => {
    const tips = await createTips();
    const message = await sendMessage(tips, text);

    expect(
      message.querySelector("iframe,img,svg,form,input,script,a"),
    ).toBeNull();
  });

  it("keeps ordinary tip formatting while removing every HTML attribute", async () => {
    const tips = await createTips();
    const message = await sendMessage(
      tips,
      '<span onclick="alert(1)" style="background:url(https://example.com)" data-source="injected" aria-hidden="true">标题</span><br><strong id="injected">重点</strong><em title="injected">内容</em>',
    );

    expect(message.querySelector("span")?.textContent).toBe("标题");
    expect(message.querySelector("br")).not.toBeNull();
    expect(message.querySelector("strong")?.textContent).toBe("重点");
    expect(message.querySelector("em")?.textContent).toBe("内容");
    for (const element of message.querySelectorAll("*")) {
      expect(element.attributes.length).toBe(0);
    }
  });

  it("displays escaped HTML as literal text in ordinary messages", async () => {
    const tips = await createTips();
    const message = await sendMessage(
      tips,
      "<span>&lt;iframe src=&quot;about:blank&quot;&gt;&lt;/iframe&gt;</span>",
    );

    expect(message.querySelector("iframe")).toBeNull();
    expect(message.textContent).toContain(
      '<iframe src="about:blank"></iframe>',
    );
    expect(message.querySelector("span")).not.toBeNull();
  });

  it("removes customized element names without losing the tip text", async () => {
    const tips = await createTips();
    const message = await sendMessage(
      tips,
      '<span is="issue86-span" onclick="alert(1)">保留文字</span>',
    );
    const span = message.querySelector("span");

    expect(span?.textContent).toBe("保留文字");
    expect([null, ""]).toContain(span?.getAttribute("is"));
    expect(span?.getAttribute("onclick")).toBeNull();
    expect(
      message.querySelector("iframe,img,svg,form,input,script"),
    ).toBeNull();
  });

  it("displays raw HTML from streamed Markdown as text", async () => {
    const tips = await createTips();
    const text =
      '<iframe src="about:blank"></iframe> <img src=x onerror=alert(1)>';
    const message = await streamMessage(tips, text);

    expect(message.querySelector("iframe,img")).toBeNull();
    expect(message.textContent).toContain(text);
    expect(message.classList.contains("live2d-tips-markdown")).toBe(true);
  });

  it("keeps streamed Markdown code blocks and safe links", async () => {
    const tips = await createTips();
    const message = await streamMessage(
      tips,
      '```html\n<iframe src="about:blank"></iframe>\n```\n\n[Halo](https://www.halo.run)',
    );
    const code = message.querySelector("pre > code.language-html");
    const link = message.querySelector<HTMLAnchorElement>("a");

    expect(message.querySelector("iframe")).toBeNull();
    expect(code?.textContent).toBe('<iframe src="about:blank"></iframe>\n');
    expect(link?.getAttribute("href")).toBe("https://www.halo.run");
    expect(link?.target).toBe("_blank");
    expect(link?.rel).toBe("noopener noreferrer");
  });

  it("does not create javascript links in streamed Markdown", async () => {
    const tips = await createTips();
    const message = await streamMessage(tips, "[bad](javascript:alert(1))");

    expect(message.querySelector("a")).toBeNull();
    expect(message.textContent).toContain("[bad](javascript:alert(1))");
  });

  it("sanitizes messages when returning from streamed to ordinary tips", async () => {
    vi.useFakeTimers();
    const tips = await createTips();
    await streamMessage(tips, '<img src="invalid" onerror="alert(1)">');
    window.dispatchEvent(new StreamMessageStopEvent({ showTimeout: 0 }));
    await vi.advanceTimersByTimeAsync(1000);
    await tips.updateComplete;

    expect(getMessage(tips).querySelector("img")).toBeNull();

    const message = await sendMessage(
      tips,
      '欢迎<span onclick="alert(1)">回来</span><iframe src="about:blank"></iframe>',
    );
    expect(message.textContent).toContain("欢迎回来");
    expect(message.querySelector("iframe")).toBeNull();
    expect(message.querySelector("span")?.getAttribute("onclick")).toBeNull();
    expect(message.classList.contains("live2d-tips-markdown")).toBe(false);
  });
});
