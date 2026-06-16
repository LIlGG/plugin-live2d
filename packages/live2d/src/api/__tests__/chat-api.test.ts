import {
  STREAM_MESSAGE_EVENT_NAME,
  type StreamMessageEventDetail,
} from "@/live2d/events/stream-message";
import {
  HALO_UI_MESSAGE_STREAM_HEADER,
  HALO_UI_MESSAGE_STREAM_VERSION,
  type UIMessageChunk,
} from "@halo-dev/ai-foundation-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatApi } from "../chat-api";

const streamResponse = (chunks: UIMessageChunk[]) => {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
          );
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        [HALO_UI_MESSAGE_STREAM_HEADER]: HALO_UI_MESSAGE_STREAM_VERSION,
      },
    },
  );
};

describe("ChatApi", () => {
  beforeEach(() => {
    document.title = "首页";
    document.body.innerHTML = "<main><h1>首页</h1></main>";
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("continues the SDK UI message stream after a browser tool call", async () => {
    const streamMessages: StreamMessageEventDetail[] = [];
    window.addEventListener(STREAM_MESSAGE_EVENT_NAME, (event) => {
      streamMessages.push(
        (event as CustomEvent<StreamMessageEventDetail>).detail,
      );
    });
    const requests: unknown[] = [];
    const fetchMock = vi.fn(async (_url: string | URL | Request, init) => {
      requests.push(JSON.parse(String(init?.body)));
      if (requests.length === 1) {
        return streamResponse([
          { type: "text-start", id: "txt-1" },
          { type: "text-delta", id: "txt-1", delta: "我先看一下页面。" },
          { type: "text-end", id: "txt-1" },
          {
            type: "tool-input-available",
            toolCallId: "call-ctx",
            toolName: "get_current_page_context",
            input: {},
          },
          {
            type: "finish-step",
            stepIndex: 0,
            finishReason: "tool-calls",
            rawFinishReason: "TOOL_CALLS",
          },
          {
            type: "finish",
            finishReason: "tool-calls",
            rawFinishReason: "TOOL_CALLS",
          },
        ]);
      }
      return streamResponse([
        { type: "text-start", id: "txt-2" },
        {
          type: "text-delta",
          id: "txt-2",
          delta: "当前页面没有检测到评论区，不能直接留言。",
        },
      ]);
    });
    vi.stubGlobal("fetch", fetchMock);

    const chatApi = new ChatApi({
      apiEndpoint: "/api/chat",
      chunkTimeout: 1,
      showChatMessageTimeout: 1,
    });

    await chatApi.sendMessage("帮我给站长留个言", []);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondRequest = requests[1] as {
      messages: Array<{
        role: string;
        parts: Array<Record<string, unknown>>;
      }>;
    };
    const assistant = secondRequest.messages.find(
      (message) => message.role === "assistant",
    );
    expect(assistant?.parts).toContainEqual(
      expect.objectContaining({
        toolCallId: "call-ctx",
        toolName: "get_current_page_context",
        state: "output-available",
        output: expect.objectContaining({
          ok: true,
          capabilities: expect.objectContaining({
            comment: expect.objectContaining({
              hasArea: false,
            }),
          }),
        }),
      }),
    );
    const storedHistory = JSON.parse(
      localStorage.getItem("historyMessages") ?? "[]",
    ) as Array<{
      role: string;
      parts: Array<Record<string, unknown>>;
    }>;
    const storedToolParts = storedHistory
      .flatMap((message) => message.parts)
      .filter((part) => part.toolCallId === "call-ctx");
    expect(storedToolParts).toHaveLength(1);
    expect(storedToolParts[0]).toEqual(
      expect.objectContaining({
        state: "output-available",
      }),
    );
    expect(streamMessages).not.toContainEqual(
      expect.objectContaining({
        mode: "replace",
        text: "",
      }),
    );
    expect(replayStreamMessage(streamMessages)).toBe(
      "当前页面没有检测到评论区，不能直接留言。",
    );
  });

  it("keeps the pre-tool text visible before replacing it with automatic continuation text", async () => {
    const streamMessages: StreamMessageEventDetail[] = [];
    const listener = (event: Event) => {
      streamMessages.push(
        (event as CustomEvent<StreamMessageEventDetail>).detail,
      );
    };
    window.addEventListener(STREAM_MESSAGE_EVENT_NAME, listener);
    const fetchMock = vi.fn(async () => {
      if (fetchMock.mock.calls.length === 1) {
        return streamResponse([
          { type: "text-start", id: "txt-before-tool" },
          {
            type: "text-delta",
            id: "txt-before-tool",
            delta: "我先看一下页面。",
          },
          {
            type: "tool-input-available",
            toolCallId: "call-delayed-replace",
            toolName: "get_current_page_context",
            input: {},
          },
          {
            type: "finish",
            finishReason: "tool-calls",
            rawFinishReason: "TOOL_CALLS",
          },
        ]);
      }
      return streamResponse([
        { type: "text-start", id: "txt-after-tool" },
        {
          type: "text-delta",
          id: "txt-after-tool",
          delta: "首页没有评论框，不能直接留言。",
        },
      ]);
    });
    vi.stubGlobal("fetch", fetchMock);

    const chatApi = new ChatApi({
      apiEndpoint: "/api/chat",
      chunkTimeout: 1,
      showChatMessageTimeout: 1,
      autoContinuationMessageMinVisibleMs: 250,
    });

    try {
      const sendPromise = chatApi.sendMessage("帮我给站长留个言", []);
      await waitForCondition(() => fetchMock.mock.calls.length === 2);

      expect(replayStreamMessage(streamMessages)).toContain("我先看一下页面。");
      expect(replayStreamMessage(streamMessages)).not.toContain(
        "首页没有评论框，不能直接留言。",
      );

      await waitForCondition(() =>
        replayStreamMessage(streamMessages).includes(
          "首页没有评论框，不能直接留言。",
        ),
      );
      await sendPromise;

      expect(replayStreamMessage(streamMessages)).toBe(
        "首页没有评论框，不能直接留言。",
      );
    } finally {
      window.removeEventListener(STREAM_MESSAGE_EVENT_NAME, listener);
    }
  });

  it("does not keep auto-submitting after the completed tool output has already continued once", async () => {
    const requests: unknown[] = [];
    const fetchMock = vi.fn(async (_url: string | URL | Request, init) => {
      requests.push(JSON.parse(String(init?.body)));
      if (requests.length === 1) {
        return streamResponse([
          { type: "text-start", id: "txt-1" },
          { type: "text-delta", id: "txt-1", delta: "我先看看当前页面。" },
          {
            type: "tool-input-available",
            toolCallId: "call-page-context",
            toolName: "get_current_page_context",
            input: {},
          },
          {
            type: "finish",
            finishReason: "tool-calls",
            rawFinishReason: "TOOL_CALLS",
          },
        ]);
      }
      if (requests.length === 2) {
        return streamResponse([
          { type: "start", messageId: "assistant-after-tool" },
          { type: "text-start", id: "txt-2" },
          {
            type: "text-delta",
            id: "txt-2",
            delta: "首页没有评论框，不能直接给站长留言。",
          },
        ]);
      }
      throw new Error("Unexpected automatic continuation without a new tool.");
    });
    vi.stubGlobal("fetch", fetchMock);

    const chatApi = new ChatApi({
      apiEndpoint: "/api/chat",
      chunkTimeout: 1,
      showChatMessageTimeout: 1,
    });

    await chatApi.sendMessage("帮我给站长留个言", []);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondRequest = requests[1] as {
      messages: Array<{
        role: string;
        parts: Array<Record<string, unknown>>;
      }>;
    };
    const assistant = secondRequest.messages.find(
      (message) => message.role === "assistant",
    );
    expect(assistant?.parts).toContainEqual(
      expect.objectContaining({
        toolCallId: "call-page-context",
        state: "output-available",
      }),
    );
  });

  it("continues after an async browser tool resolves later than the first stream", async () => {
    window.Live2DAI?.registerTool("slow_page_context", async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { page: "home" };
    });

    const requests: unknown[] = [];
    const fetchMock = vi.fn(async (_url: string | URL | Request, init) => {
      requests.push(JSON.parse(String(init?.body)));
      if (requests.length === 1) {
        return streamResponse([
          { type: "text-start", id: "txt-1" },
          { type: "text-delta", id: "txt-1", delta: "我先看一下。" },
          {
            type: "tool-input-available",
            toolCallId: "call-slow",
            toolName: "slow_page_context",
            input: {},
          },
          {
            type: "finish-step",
            stepIndex: 0,
            finishReason: "tool-calls",
            rawFinishReason: "TOOL_CALLS",
          },
          {
            type: "finish",
            finishReason: "tool-calls",
            rawFinishReason: "TOOL_CALLS",
          },
        ]);
      }
      return streamResponse([
        { type: "text-start", id: "txt-2" },
        { type: "text-delta", id: "txt-2", delta: "已经看完了。" },
      ]);
    });
    vi.stubGlobal("fetch", fetchMock);

    const chatApi = new ChatApi({
      apiEndpoint: "/api/chat",
      chunkTimeout: 1,
      showChatMessageTimeout: 1,
      agent: {
        builtIn: {
          pageContext: false,
          haloNavigation: false,
          haloContentSearch: false,
          networkAccess: false,
          commentCapability: "off",
        },
        aiTools: [
          {
            name: "slow_page_context",
            description: "读取页面上下文",
            inputSchema: {},
            approval: "never",
            requiredAuth: "none",
            actionType: "registered",
            action: { type: "registered" },
          },
        ],
        toolSecurity: {
          allowedExternalOrigins: [],
          allowNewTab: false,
        },
        haloSearch: {
          allowedTypes: [],
          defaultLimit: 5,
        },
        haloResourceDetail: {
          maxContentChars: 1000,
        },
      },
    });

    await chatApi.sendMessage("帮我看看页面", []);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondRequest = requests[1] as {
      messages: Array<{
        role: string;
        parts: Array<Record<string, unknown>>;
      }>;
    };
    const assistant = secondRequest.messages.find(
      (message) => message.role === "assistant",
    );
    expect(assistant?.parts).toContainEqual(
      expect.objectContaining({
        toolCallId: "call-slow",
        toolName: "slow_page_context",
        state: "output-available",
        output: expect.objectContaining({
          ok: true,
          output: { page: "home" },
        }),
      }),
    );
  });

  it("continues even when the first assistant step only contains a tool call", async () => {
    const fetchMock = vi.fn(async () => {
      if (fetchMock.mock.calls.length === 1) {
        return streamResponse([
          {
            type: "tool-input-available",
            toolCallId: "call-ctx-only",
            toolName: "get_current_page_context",
            input: {},
          },
          {
            type: "finish",
            finishReason: "tool-calls",
            rawFinishReason: "TOOL_CALLS",
          },
        ]);
      }
      return streamResponse([
        { type: "text-start", id: "txt-final" },
        { type: "text-delta", id: "txt-final", delta: "页面看完了。" },
      ]);
    });
    vi.stubGlobal("fetch", fetchMock);

    const chatApi = new ChatApi({
      apiEndpoint: "/api/chat",
      chunkTimeout: 1,
      showChatMessageTimeout: 1,
    });

    await chatApi.sendMessage("查看当前页面", []);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows automatic text when the second stream reuses the previous text part id", async () => {
    const streamMessages: StreamMessageEventDetail[] = [];
    window.addEventListener(STREAM_MESSAGE_EVENT_NAME, (event) => {
      streamMessages.push(
        (event as CustomEvent<StreamMessageEventDetail>).detail,
      );
    });
    const fetchMock = vi.fn(async () => {
      if (fetchMock.mock.calls.length === 1) {
        return streamResponse([
          { type: "text-start", id: "txt-shared" },
          { type: "text-delta", id: "txt-shared", delta: "我先看一下页面。" },
          {
            type: "tool-input-available",
            toolCallId: "call-reused-text",
            toolName: "get_current_page_context",
            input: {},
          },
          {
            type: "finish",
            finishReason: "tool-calls",
            rawFinishReason: "TOOL_CALLS",
          },
        ]);
      }
      return streamResponse([
        { type: "reasoning-start", id: "rsn-1" },
        { type: "reasoning-delta", id: "rsn-1", delta: "正在分析页面" },
        { type: "reasoning-end", id: "rsn-1" },
        {
          type: "text-delta",
          id: "txt-shared",
          delta: "当前页面可以继续处理。",
        },
      ]);
    });
    vi.stubGlobal("fetch", fetchMock);

    const chatApi = new ChatApi({
      apiEndpoint: "/api/chat",
      chunkTimeout: 1,
      showChatMessageTimeout: 1,
    });

    await chatApi.sendMessage("查看当前页面", []);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(replayStreamMessage(streamMessages)).toBe("当前页面可以继续处理。");
  });

  it("compacts duplicate final tool results before sending history", async () => {
    const requests: unknown[] = [];
    const fetchMock = vi.fn(async (_url: string | URL | Request, init) => {
      requests.push(JSON.parse(String(init?.body)));
      return streamResponse([
        { type: "text-start", id: "txt-reply" },
        { type: "text-delta", id: "txt-reply", delta: "可以继续聊天。" },
      ]);
    });
    vi.stubGlobal("fetch", fetchMock);

    const chatApi = new ChatApi({
      apiEndpoint: "/api/chat",
      chunkTimeout: 1,
      showChatMessageTimeout: 1,
    });

    await chatApi.sendMessage("继续", [
      {
        id: "msg-user",
        role: "user",
        parts: [{ type: "text", id: "txt-user", text: "查看页面" }],
      },
      {
        id: "msg-assistant",
        role: "assistant",
        parts: [
          {
            type: "tool-get_current_page_context",
            toolCallId: "call-duplicated",
            toolName: "get_current_page_context",
            state: "output-available",
            input: {},
            output: { ok: true, stale: true },
          },
          {
            type: "tool-get_current_page_context",
            toolCallId: "call-duplicated",
            toolName: "get_current_page_context",
            state: "output-available",
            input: {},
            output: { ok: true, fresh: true },
          },
        ],
      },
    ]);

    const firstRequest = requests[0] as {
      messages: Array<{ parts: Array<Record<string, unknown>> }>;
    };
    const duplicatedToolParts = firstRequest.messages
      .flatMap((message) => message.parts)
      .filter((part) => part.toolCallId === "call-duplicated");
    expect(duplicatedToolParts).toHaveLength(1);
    expect(duplicatedToolParts[0]).toEqual(
      expect.objectContaining({
        output: { ok: true, fresh: true },
      }),
    );
  });

  it("stores an agent resume intent when a tool navigates with page reload", async () => {
    window.Live2DAI?.registerTool("reload_navigation", () => ({
      ok: true,
      navigating: true,
      pageReload: true,
    }));

    const fetchMock = vi.fn(async () => {
      if (fetchMock.mock.calls.length === 1) {
        return streamResponse([
          {
            type: "tool-input-available",
            toolCallId: "call-reload",
            toolName: "reload_navigation",
            input: {},
          },
          {
            type: "finish",
            finishReason: "tool-calls",
            rawFinishReason: "TOOL_CALLS",
          },
        ]);
      }
      return streamResponse([
        { type: "text-start", id: "txt-after-reload" },
        { type: "text-delta", id: "txt-after-reload", delta: "继续处理。" },
      ]);
    });
    vi.stubGlobal("fetch", fetchMock);

    const chatApi = new ChatApi({
      apiEndpoint: "/api/chat",
      chunkTimeout: 1,
      showChatMessageTimeout: 1,
      agent: {
        builtIn: {
          pageContext: false,
          haloNavigation: false,
          haloContentSearch: false,
          networkAccess: false,
          commentCapability: "off",
        },
        aiTools: [
          {
            name: "reload_navigation",
            description: "刷新当前页面",
            inputSchema: {},
            approval: "never",
            requiredAuth: "none",
            actionType: "registered",
            action: { type: "registered" },
          },
        ],
        toolSecurity: {
          allowedExternalOrigins: [],
          allowNewTab: false,
        },
        haloSearch: {
          allowedTypes: [],
          defaultLimit: 5,
        },
        haloResourceDetail: {
          maxContentChars: 1000,
        },
      },
    });

    await chatApi.sendMessage("打开一篇文章后继续留言", []);

    const intent = JSON.parse(
      sessionStorage.getItem("live2d:agent-after-navigation") ?? "{}",
    ) as {
      openChat?: boolean;
      resume?: {
        message?: string;
        historyMessages?: Array<{ parts: Array<Record<string, unknown>> }>;
      };
    };
    expect(intent.openChat).toBe(true);
    expect(intent.resume?.message).toContain("继续完成上一条用户请求");
    const resumeToolParts = intent.resume?.historyMessages
      ?.flatMap((message) => message.parts)
      .filter((part) => part.toolCallId === "call-reload");
    expect(resumeToolParts).toHaveLength(1);
    expect(resumeToolParts?.[0]).toEqual(
      expect.objectContaining({
        state: "output-available",
        output: expect.objectContaining({
          output: expect.objectContaining({
            navigating: true,
            pageReload: true,
          }),
        }),
      }),
    );
  });
});

const replayStreamMessage = (messages: StreamMessageEventDetail[]) =>
  messages.reduce((current, message) => {
    if (message.mode === "replace") {
      return message.text;
    }
    return `${current}${message.text}`;
  }, "");

const waitForCondition = async (condition: () => boolean, timeoutMs = 1000) => {
  const startedAt = Date.now();
  while (!condition()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error("Timed out waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};
