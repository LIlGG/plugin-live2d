import type { AgentRuntimeConfig } from "@/live2d/config/agent-tools/agent-tool-config";
import type { ToolPart } from "@halo-dev/ai-foundation-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentToolRuntime } from "../agent-tool-runtime";

const baseConfig = (): AgentRuntimeConfig => ({
  builtIn: {
    pageContext: true,
    haloNavigation: true,
    haloContentSearch: true,
    networkAccess: false,
    commentCapability: "assist",
  },
  aiTools: [],
  toolSecurity: {
    allowedExternalOrigins: [],
    allowNewTab: false,
  },
  haloSearch: {
    allowedTypes: ["post.content.halo.run", "singlepage.content.halo.run"],
    defaultLimit: 5,
  },
  haloResourceDetail: {
    maxContentChars: 3000,
  },
});

const toolPart = (
  toolName: string,
  input: Record<string, unknown> = {},
): ToolPart => ({
  type: `tool-${toolName}`,
  toolCallId: `call-${toolName}`,
  toolName,
  state: "input-available",
  input,
});

describe("AgentToolRuntime", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("binds registered executor only for declared tools", async () => {
    const config = baseConfig();
    config.aiTools = [
      {
        name: "show_owner_updates",
        description: "展示站长动态",
        inputSchema: { type: "object", properties: {} },
        approval: "never",
        requiredAuth: "none",
        actionType: "registered",
        action: { type: "registered" },
      },
    ];
    const runtime = new AgentToolRuntime({ config });
    window.Live2DAI?.registerTool("show_owner_updates", ({ input }) => ({
      received: input,
    }));

    const result = await runtime.execute(
      toolPart("show_owner_updates", { limit: 3 }),
    );

    expect(result.ok).toBe(true);
    expect(result.output).toEqual({ received: { limit: 3 } });
    expect(runtime.canExecute("not_declared")).toBe(false);
  });

  it("does not navigate to resources that are not trusted by previous outputs", async () => {
    const runtime = new AgentToolRuntime({ config: baseConfig() });

    const result = await runtime.execute(
      toolPart("open_halo_resource", {
        resourceId: "post.content.halo.run:demo",
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("RESOURCE_NOT_TRUSTED");
  });

  it("reports page comment capability before comment actions", async () => {
    document.title = "首页";
    document.body.innerHTML = `
      <main>
        <h1>首页</h1>
        <a href="/archives/demo">文章</a>
        <form id="search"><input name="keyword" /><button>搜索</button></form>
      </main>
    `;
    const runtime = new AgentToolRuntime({ config: baseConfig() });

    const result = await runtime.execute(toolPart("get_current_page_context"));

    expect(result.ok).toBe(true);
    expect(result.capabilities).toMatchObject({
      comment: {
        hasArea: false,
        hasInput: false,
        hasSubmitButton: false,
      },
    });
    expect(result.headings).toEqual([{ level: 1, text: "首页" }]);
  });

  it("executes default page context tool when runtime config is not provided", async () => {
    document.title = "默认配置页面";
    document.body.innerHTML = "<main><h1>默认配置页面</h1></main>";
    const runtime = new AgentToolRuntime();

    expect(runtime.canExecute("get_current_page_context")).toBe(true);

    const result = await runtime.execute(toolPart("get_current_page_context"));

    expect(result).toMatchObject({
      ok: true,
      title: "默认配置页面",
      capabilities: {
        comment: {
          hasArea: false,
        },
      },
    });
  });

  it("reports writable comment controls when present", async () => {
    document.body.innerHTML = `
      <section id="comments">
        <textarea name="content"></textarea>
        <button type="submit">提交评论</button>
      </section>
    `;
    const runtime = new AgentToolRuntime({ config: baseConfig() });

    const result = await runtime.execute(toolPart("get_current_page_context"));

    expect(result.capabilities).toMatchObject({
      comment: {
        hasArea: true,
        hasInput: true,
        hasSubmitButton: true,
      },
    });
  });

  it("does not draft comments when current page has no comment area", async () => {
    document.body.innerHTML = "<main><h1>首页</h1></main>";
    const runtime = new AgentToolRuntime({ config: baseConfig() });

    const result = await runtime.execute(
      toolPart("draft_comment", { content: "我想留言" }),
    );

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("COMMENT_INPUT_NOT_FOUND");
    expect(result.message).toBe("当前页面没有检测到评论区，无法填写评论");
  });

  it("fills comment draft in assist mode without submitting", async () => {
    document.body.innerHTML = `
      <section id="comments">
        <textarea name="content"></textarea>
        <button type="submit">提交评论</button>
      </section>
    `;
    const submit = document.querySelector<HTMLButtonElement>("button");
    const click = vi.spyOn(submit as HTMLButtonElement, "click");
    const runtime = new AgentToolRuntime({ config: baseConfig() });

    const result = await runtime.execute(
      toolPart("draft_comment", { content: "这篇文章很有帮助" }),
    );

    expect(result.ok).toBe(true);
    expect(document.querySelector<HTMLTextAreaElement>("textarea")?.value).toBe(
      "这篇文章很有帮助",
    );
    expect(click).not.toHaveBeenCalled();
  });

  it("submits comment only when submit capability is enabled", async () => {
    document.body.innerHTML = `
      <section id="comments">
        <textarea name="content"></textarea>
        <button type="submit">提交评论</button>
      </section>
    `;
    const config = baseConfig();
    config.builtIn.commentCapability = "submit";
    const submit = document.querySelector<HTMLButtonElement>("button");
    const click = vi.spyOn(submit as HTMLButtonElement, "click");
    const runtime = new AgentToolRuntime({ config });

    const result = await runtime.execute(
      toolPart("submit_comment", { content: "请帮我提交这条评论" }),
    );

    expect(result.ok).toBe(true);
    expect(document.querySelector<HTMLTextAreaElement>("textarea")?.value).toBe(
      "请帮我提交这条评论",
    );
    expect(click).toHaveBeenCalledOnce();
  });

  it("remembers chat recovery intent before opening trusted resources", async () => {
    vi.useFakeTimers();
    const assign = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, assign },
    });
    const runtime = new AgentToolRuntime({ config: baseConfig() });
    runtime.ingestMessages([
      {
        id: "assistant-1",
        role: "assistant",
        parts: [
          {
            type: "tool-search_halo_contents",
            toolCallId: "call-search",
            toolName: "search_halo_contents",
            state: "output-available",
            input: {},
            output: {
              resources: [
                {
                  resourceId: "post.content.halo.run:demo",
                  permalink: "/archives/demo",
                  title: "Demo",
                },
              ],
            },
          },
        ],
      },
    ]);

    const result = await runtime.execute(
      toolPart("open_halo_resource", {
        resourceId: "post.content.halo.run:demo",
      }),
    );
    vi.runAllTimers();

    expect(result.ok).toBe(true);
    expect(assign).toHaveBeenCalledWith("/archives/demo");
    expect(sessionStorage.getItem("live2d:agent-after-navigation")).toContain(
      '"openChat":true',
    );
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
    vi.useRealTimers();
  });

  it("resolves approval overlay from visitor choice", async () => {
    const runtime = new AgentToolRuntime({ config: baseConfig() });

    const approval = runtime.requestApproval("要执行这个动作吗？");
    document
      .querySelector<HTMLButtonElement>("#live2d-agent-approval button")
      ?.click();

    await expect(approval).resolves.toBe(true);
  });
});
