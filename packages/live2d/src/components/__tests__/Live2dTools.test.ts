import type { Tool } from "@/live2d/live2d/tools/tools";
import { afterEach, describe, expect, it, vi } from "vitest";
import "../Live2dTools";

type TestableLive2dTools = HTMLElement & {
  compact: boolean;
  _tools: Tool[];
  _isExpanded: boolean;
  updateComplete: Promise<boolean>;
};

const createTool = (name = "chat") => {
  const triggerExecute = vi.fn().mockResolvedValue(undefined);
  const tool = {
    icon: () => "ph:chat-circle",
    name: () => name,
    triggerExecute,
  } as unknown as Tool;
  return { tool, triggerExecute };
};

describe("Live2dTools drawer", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it("expands, scrolls, and collapses after using a tool on mobile", async () => {
    const { tool, triggerExecute } = createTool();
    const tools = document.createElement(
      "live2d-tools",
    ) as unknown as TestableLive2dTools;
    tools.compact = true;
    tools._tools = [tool];
    document.body.append(tools);
    await tools.updateComplete;

    const toggle = tools.shadowRoot?.querySelector<HTMLButtonElement>(
      "#live2d-tools-toggle",
    );
    const toolList =
      tools.shadowRoot?.querySelector<HTMLElement>("#live2d-tools");
    const shell = tools.shadowRoot?.querySelector<HTMLElement>(
      "#live2d-tools-shell",
    );
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    expect(toolList?.getAttribute("aria-hidden")).toBe("true");
    expect(toggle?.classList.contains("border-none")).toBe(true);
    expect(shell?.style.background).toContain("rgba(255, 250, 244, 0.86)");

    toggle?.click();
    await tools.updateComplete;
    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
    expect(toolList?.getAttribute("aria-hidden")).toBe("false");
    expect(toolList?.classList.contains("overflow-y-auto")).toBe(true);
    expect(toolList?.style.maxHeight).toBe("min(10rem, calc(42vh - 3rem))");

    tools.shadowRoot
      ?.querySelector<HTMLButtonElement>("#live2d-tool-chat")
      ?.click();
    await tools.updateComplete;
    expect(triggerExecute).toHaveBeenCalledOnce();
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
  });

  it("keeps the desktop toolbar expanded without a drawer toggle", async () => {
    const { tool } = createTool();
    const tools = document.createElement(
      "live2d-tools",
    ) as unknown as TestableLive2dTools;
    tools.compact = false;
    tools._tools = [tool];
    document.body.append(tools);
    await tools.updateComplete;

    expect(tools.shadowRoot?.querySelector("#live2d-tools-toggle")).toBeNull();
    expect(
      tools.shadowRoot
        ?.querySelector("#live2d-tools")
        ?.getAttribute("aria-hidden"),
    ).toBe("false");
    expect(
      tools.shadowRoot?.querySelector<HTMLElement>("#live2d-tools")?.style
        .maxHeight,
    ).toBe("calc(100vh - 4rem)");
    expect(
      tools.shadowRoot?.querySelector<HTMLElement>("#live2d-tools-shell")?.style
        .background,
    ).toContain("rgba(255, 250, 244, 0.72)");
  });

  it("moves one shared hover indicator between tools without scaling buttons", async () => {
    const first = createTool("chat").tool;
    const second = createTool("photo").tool;
    const tools = document.createElement(
      "live2d-tools",
    ) as unknown as TestableLive2dTools;
    tools._tools = [first, second];
    document.body.append(tools);
    await tools.updateComplete;

    const indicator = tools.shadowRoot?.querySelector<HTMLElement>(
      "#live2d-tools-hover-indicator",
    );
    const firstButton =
      tools.shadowRoot?.querySelector<HTMLButtonElement>("#live2d-tool-chat");
    const secondButton =
      tools.shadowRoot?.querySelector<HTMLButtonElement>("#live2d-tool-photo");

    firstButton?.dispatchEvent(new MouseEvent("mouseenter"));
    await tools.updateComplete;
    expect(indicator?.style.opacity).toBe("1");
    expect(indicator?.style.transform).toBe("translate3d(0, 0px, 0)");
    expect(indicator?.style.background).toBe("rgba(255, 255, 255, 0.85)");

    secondButton?.dispatchEvent(new MouseEvent("mouseenter"));
    await tools.updateComplete;
    expect(indicator?.style.transform).toBe("translate3d(0, 40px, 0)");
    expect(secondButton?.classList.contains("hover:scale-105")).toBe(false);
    expect(secondButton?.classList.contains("hover:color-[#0684bd]")).toBe(
      true,
    );
  });
});
