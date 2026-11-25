import type { Live2dTips } from "@/live2d/components/Live2dTips";
import "@/live2d/components/Live2dTips";
import { createDefaultLive2dConfig } from "@/live2d/config/default-config";
import {
  SEND_MESSAGE_EVENT_NAME,
  SendMessageEvent,
} from "@/live2d/events/send-message";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type HitokotoResult, HitokotoTool } from "../hitokoto";

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

const mockHitokoto = (result: HitokotoResult) => {
  const fetchMock = vi.fn().mockResolvedValue({
    json: vi.fn().mockResolvedValue(result),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

describe("HitokotoTool message rendering", () => {
  let messages: SendMessageEvent[];
  const recordMessage = (event: Event) => {
    messages.push(event as SendMessageEvent);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    messages = [];
    window.addEventListener(SEND_MESSAGE_EVENT_NAME, recordMessage);
  });

  afterEach(() => {
    window.removeEventListener(SEND_MESSAGE_EVENT_NAME, recordMessage);
    document.body.replaceChildren();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([
    '<iframe src="about:blank" srcdoc="<script>alert(1)</script>"></iframe>',
    '<img src="invalid" onerror="alert(1)">',
    '<span onclick="alert(1)" style="color:red" data-source="injected">注入</span>',
  ])("keeps API HTML literal in every response field: %s", async (payload) => {
    const result = {
      hitokoto: `内容 ${payload}`,
      from: `来源 ${payload}`,
      creator: `作者 ${payload}`,
    };
    const fetchMock = mockHitokoto(result);
    const tips = await createTips();

    await new HitokotoTool(createDefaultLive2dConfig()).execute();
    await tips.updateComplete;
    const sentence = getMessage(tips);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toBeInstanceOf(SendMessageEvent);
    expect(sentence.textContent?.trim()).toBe(result.hitokoto);
    expect(sentence.querySelector("iframe,img,script,span")).toBeNull();

    await vi.advanceTimersByTimeAsync(6000);
    await tips.updateComplete;
    const description = getMessage(tips);
    const spans = description.querySelectorAll("span");

    expect(messages).toHaveLength(2);
    expect(messages[1]).toBeInstanceOf(SendMessageEvent);
    expect(description.textContent?.trim()).toBe(
      `这句一言来自 「${result.from}」，是 ${result.creator} 在 hitokoto.cn 投稿的。`,
    );
    expect(description.querySelector("iframe,img,script")).toBeNull();
    expect(spans).toHaveLength(2);
    expect(spans[0].textContent).toBe(`「${result.from}」`);
    expect(spans[1].textContent).toBe(result.creator);
    for (const span of spans) {
      expect(span.attributes.length).toBe(0);
    }
  });

  it("keeps the sentence and delayed source formatting for ordinary data", async () => {
    const result = {
      hitokoto: "生活明朗，万物可爱。",
      from: "旅人 & 世界",
      creator: '李"明',
    };
    mockHitokoto(result);
    const tips = await createTips();

    await new HitokotoTool(createDefaultLive2dConfig()).execute();
    await tips.updateComplete;

    expect(getMessage(tips).textContent?.trim()).toBe(result.hitokoto);
    expect(messages).toHaveLength(1);
    expect(messages[0].detail.timeout).toBe(6000);

    await vi.advanceTimersByTimeAsync(6000);
    await tips.updateComplete;
    const description = getMessage(tips);

    expect(messages).toHaveLength(2);
    expect(messages[1].detail.timeout).toBe(4000);
    expect(description.textContent?.trim()).toBe(
      `这句一言来自 「${result.from}」，是 ${result.creator} 在 hitokoto.cn 投稿的。`,
    );
    expect(
      Array.from(
        description.querySelectorAll("span"),
        (span) => span.textContent,
      ),
    ).toEqual([`「${result.from}」`, result.creator]);
  });
});
