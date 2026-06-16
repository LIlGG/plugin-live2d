import { rememberAgentAfterNavigationIntent } from "@/live2d/api/agent-navigation-intent";
import type { AgentRuntimeConfig } from "@/live2d/config/agent-tools/agent-tool-config";
import { normalizeAgentRuntimeConfig } from "@/live2d/config/agent-tools/normalize-agent-tools";
import { sendMessage } from "@/live2d/helpers/sendMessage";
import type { ToolPart, UIMessage } from "@halo-dev/ai-foundation-sdk";

export interface AgentToolRuntimeOptions {
  config?: AgentRuntimeConfig;
}

export interface AgentToolResult {
  ok: boolean;
  [key: string]: unknown;
}

type RegisteredExecutor = (context: {
  input: Record<string, unknown>;
  toolName: string;
}) => Promise<unknown> | unknown;

interface TrustedResource {
  resourceId: string;
  permalink: string;
  title?: string;
}

const registeredExecutors = new Map<string, RegisteredExecutor>();

declare global {
  interface Window {
    Live2DAI?: {
      registerTool: (name: string, executor: RegisteredExecutor) => void;
    };
  }
}

const ensureGlobalRegistry = () => {
  if (window.Live2DAI) {
    return;
  }
  window.Live2DAI = {
    registerTool(name, executor) {
      if (!/^[a-z][a-z0-9_]{2,63}$/.test(name)) {
        return;
      }
      registeredExecutors.set(name, executor);
    },
  };
};

ensureGlobalRegistry();

export class AgentToolRuntime {
  private readonly config: AgentRuntimeConfig;
  private readonly trustedResources = new Map<string, TrustedResource>();

  constructor(options: AgentToolRuntimeOptions = {}) {
    this.config = normalizeAgentRuntimeConfig(options.config);
  }

  canExecute(toolName: string): boolean {
    return (
      this.builtInToolNames().has(toolName) ||
      this.config.aiTools.some((tool) => tool.name === toolName)
    );
  }

  ingestMessages(messages: UIMessage[]): void {
    for (const message of messages) {
      for (const part of message.parts) {
        if (!isToolPart(part) || part.state !== "output-available") {
          continue;
        }
        this.ingestToolOutput(part.output);
      }
    }
  }

  async execute(part: ToolPart): Promise<AgentToolResult> {
    const input = part.input ?? {};
    try {
      if (part.toolName === "get_current_page_context") {
        return this.getCurrentPageContext();
      }
      if (part.toolName === "open_halo_resource") {
        return this.openHaloResource(input);
      }
      if (part.toolName === "open_comment_area") {
        return this.scrollToCommentArea();
      }
      if (part.toolName === "draft_comment") {
        if (this.config.builtIn.commentCapability === "off") {
          return failure("TOOL_NOT_ALLOWED", "评论辅助能力未启用");
        }
        return this.fillCommentDraft(input);
      }
      if (part.toolName === "submit_comment") {
        if (this.config.builtIn.commentCapability !== "submit") {
          return failure("TOOL_NOT_ALLOWED", "评论提交能力未启用");
        }
        return this.submitComment(input);
      }
      const customTool = this.config.aiTools.find(
        (tool) => tool.name === part.toolName,
      );
      if (!customTool) {
        return failure("TOOL_NOT_FOUND", "这个功能还没有配置好");
      }
      const action = customTool.action;
      if (this.requiresApproval(customTool.approval, action)) {
        const approved = await this.requestApproval(
          `要我帮你执行「${customTool.description}」吗？`,
        );
        if (!approved) {
          return failure("TOOL_APPROVAL_DENIED", "访客取消了这次操作");
        }
      }
      this.showStatus(action.pendingMessage ?? "我来帮你处理一下～");
      let result: AgentToolResult;
      switch (action.type) {
        case "navigate":
          result = this.navigate(action.url, action.target);
          break;
        case "scroll-to":
          result = this.scrollToSelector(action.selector, action.behavior);
          break;
        case "highlight":
          result = this.highlight(action.selector, action.duration);
          break;
        case "dispatch-event":
          window.dispatchEvent(
            new CustomEvent(action.event, {
              detail: input,
            }),
          );
          result = { ok: true };
          break;
        case "registered": {
          const executor = registeredExecutors.get(part.toolName);
          if (!executor) {
            return failure(
              "TOOL_EXECUTOR_NOT_FOUND",
              "这个站点还没有启用对应能力",
            );
          }
          result = {
            ok: true,
            output: await executor({ input, toolName: part.toolName }),
          };
          break;
        }
      }
      this.showStatus(
        result.ok
          ? (action.successMessage ?? "已经处理好啦～")
          : (action.errorMessage ?? "这个功能暂时没处理成功～"),
      );
      return result;
    } catch (error) {
      return failure(
        "TOOL_EXECUTION_FAILED",
        error instanceof Error ? error.message : "工具执行失败",
      );
    }
  }

  private builtInToolNames(): Set<string> {
    const names = new Set<string>();
    const builtIn = this.config.builtIn;
    if (builtIn.pageContext) {
      names.add("get_current_page_context");
    }
    if (builtIn.haloNavigation) {
      names.add("open_halo_resource");
    }
    if (builtIn.commentCapability !== "off") {
      names.add("open_comment_area");
      names.add("draft_comment");
    }
    if (builtIn.commentCapability === "submit") {
      names.add("submit_comment");
    }
    return names;
  }

  private getCurrentPageContext(): AgentToolResult {
    const selectedText = window.getSelection()?.toString().trim() ?? "";
    const commentInput = this.findCommentInput();
    const commentArea = this.findCommentArea();
    const commentSubmit = commentInput?.container
      ? this.findCommentSubmitButton(commentInput.container)
      : undefined;
    return {
      ok: true,
      title: document.title,
      url: window.location.href,
      path: window.location.pathname,
      description:
        document
          .querySelector<HTMLMetaElement>("meta[name='description']")
          ?.content.trim() ?? "",
      headings: this.collectHeadings(),
      selectedText: selectedText.slice(0, 1000),
      capabilities: {
        comment: {
          hasArea: !!commentArea,
          hasInput: !!commentInput,
          hasSubmitButton: !!commentSubmit,
          reason: !commentArea
            ? "当前页面没有检测到评论区"
            : !commentInput
              ? "当前页面有评论区，但没有检测到可写评论输入框"
              : !commentSubmit
                ? "当前页面有可写评论输入框，但没有检测到提交按钮"
                : "当前页面支持填写评论",
        },
        forms: this.collectFormSummaries(),
        links: this.collectLinkSummaries(),
      },
    };
  }

  private openHaloResource(input: Record<string, unknown>): AgentToolResult {
    const resourceId = stringInput(input.resourceId);
    if (!resourceId) {
      return failure("INVALID_INPUT", "resourceId is required");
    }
    const resource = this.trustedResources.get(resourceId);
    if (!resource) {
      return failure("RESOURCE_NOT_TRUSTED", "没有找到可信资源");
    }
    this.showStatus("我带你过去看看～");
    window.setTimeout(() => {
      rememberAgentAfterNavigationIntent();
      window.location.assign(resource.permalink);
    }, 50);
    return { ok: true, navigating: true, pageReload: true, resourceId };
  }

  private scrollToCommentArea(): AgentToolResult {
    const commentArea = this.findCommentArea();
    if (!commentArea) {
      this.showStatus("当前页面没有检测到评论区");
      return failure("COMMENT_AREA_NOT_FOUND", "当前页面没有检测到评论区");
    }
    commentArea.scrollIntoView?.({ behavior: "smooth", block: "center" });
    this.showStatus("已经帮你定位到评论区啦～");
    return { ok: true };
  }

  private fillCommentDraft(input: Record<string, unknown>): AgentToolResult {
    const content = stringInput(input.content);
    if (!content) {
      return failure("INVALID_INPUT", "content is required");
    }
    const target = this.findCommentInput();
    if (!target) {
      this.scrollToCommentArea();
      return failure(
        "COMMENT_INPUT_NOT_FOUND",
        this.findCommentArea()
          ? "当前页面有评论区，但没有找到可写评论输入框"
          : "当前页面没有检测到评论区，无法填写评论",
      );
    }
    target.container?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    this.writeCommentInput(target.input, content);
    target.input.focus();
    this.showStatus("评论草稿已经帮你填好了～");
    return { ok: true, drafted: true };
  }

  private submitComment(input: Record<string, unknown>): AgentToolResult {
    const draftResult = this.fillCommentDraft(input);
    if (!draftResult.ok) {
      return draftResult;
    }
    const target = this.findCommentInput();
    const submitButton = target?.container
      ? this.findCommentSubmitButton(target.container)
      : undefined;
    if (!submitButton) {
      return failure("COMMENT_SUBMIT_NOT_FOUND", "没有找到评论提交按钮");
    }
    submitButton.click();
    this.showStatus("已经尝试提交评论啦～");
    return { ok: true, submitted: true };
  }

  private navigate(
    url: string,
    target: "_self" | "_blank" = "_self",
  ): AgentToolResult {
    const destination = new URL(url, window.location.origin);
    if (!this.isAllowedUrl(destination)) {
      return failure("URL_NOT_ALLOWED", "这个链接不在允许范围内");
    }
    const useBlank =
      target === "_blank" && this.config.toolSecurity.allowNewTab;
    window.setTimeout(() => {
      if (useBlank) {
        window.open(destination.href, "_blank", "noopener,noreferrer");
      } else {
        rememberAgentAfterNavigationIntent();
        window.location.assign(destination.href);
      }
    }, 50);
    return {
      ok: true,
      navigating: true,
      pageReload: !useBlank,
      url: destination.href,
    };
  }

  private scrollToSelector(
    selector: string,
    behavior: ScrollBehavior = "smooth",
  ): AgentToolResult {
    const element = document.querySelector(selector);
    if (!element) {
      return failure("ELEMENT_NOT_FOUND", "没有找到对应的位置");
    }
    element.scrollIntoView?.({ behavior, block: "center" });
    return { ok: true };
  }

  private highlight(selector: string, duration = 1600): AgentToolResult {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) {
      return failure("ELEMENT_NOT_FOUND", "没有找到对应的位置");
    }
    const previousOutline = element.style.outline;
    const previousOutlineOffset = element.style.outlineOffset;
    element.style.outline = "2px solid #ffab5c";
    element.style.outlineOffset = "3px";
    window.setTimeout(() => {
      element.style.outline = previousOutline;
      element.style.outlineOffset = previousOutlineOffset;
    }, duration);
    return { ok: true };
  }

  private isAllowedUrl(url: URL): boolean {
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }
    if (url.origin === window.location.origin) {
      return true;
    }
    return this.config.toolSecurity.allowedExternalOrigins.includes(url.origin);
  }

  private requiresApproval(
    approval: "default" | "never" | "always",
    action: { type: string; url?: string },
  ): boolean {
    if (approval === "always") {
      return true;
    }
    if (approval === "never") {
      return false;
    }
    if (action.type === "registered" || action.type === "dispatch-event") {
      return true;
    }
    if (action.type === "navigate" && action.url) {
      const destination = new URL(action.url, window.location.origin);
      return destination.origin !== window.location.origin;
    }
    return false;
  }

  requestApproval(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const existing = document.getElementById("live2d-agent-approval");
      existing?.remove();
      const container = document.createElement("div");
      container.id = "live2d-agent-approval";
      container.style.cssText = [
        "position:fixed",
        "left:50%",
        "bottom:5.5rem",
        "z-index:10001",
        "transform:translateX(-50%)",
        "display:flex",
        "align-items:center",
        "gap:.5rem",
        "max-width:min(28rem,calc(100vw - 1rem))",
        "padding:.5rem .625rem",
        "border:1px solid #eadfce",
        "border-radius:.75rem",
        "background:rgba(255,250,244,.98)",
        "box-shadow:0 10px 24px rgba(15,23,42,.12)",
        "font-size:13px",
        "color:#334155",
      ].join(";");
      const text = document.createElement("span");
      text.textContent = message;
      text.style.cssText = "line-height:1.4;min-width:0;flex:1;";
      const allow = document.createElement("button");
      allow.type = "button";
      allow.textContent = "允许";
      allow.style.cssText = buttonStyle("#ffab5c", "#fff");
      const deny = document.createElement("button");
      deny.type = "button";
      deny.textContent = "取消";
      deny.style.cssText = buttonStyle("#eee7de", "#475569");
      const cleanup = (approved: boolean) => {
        container.remove();
        resolve(approved);
      };
      allow.addEventListener("click", () => cleanup(true), { once: true });
      deny.addEventListener("click", () => cleanup(false), { once: true });
      container.append(text, allow, deny);
      document.body.append(container);
    });
  }

  private ingestToolOutput(output: unknown): void {
    if (!output || typeof output !== "object") {
      return;
    }
    const resources = (output as { resources?: unknown }).resources;
    if (!Array.isArray(resources)) {
      return;
    }
    for (const resource of resources) {
      if (!resource || typeof resource !== "object") {
        continue;
      }
      const item = resource as Partial<TrustedResource>;
      if (item.resourceId && item.permalink) {
        this.trustedResources.set(item.resourceId, {
          resourceId: item.resourceId,
          permalink: item.permalink,
          title: item.title,
        });
      }
    }
  }

  private showStatus(message?: string): void {
    if (message) {
      sendMessage(message, 3000, 3);
    }
  }

  private findCommentInput():
    | { container: Element | undefined; input: WritableCommentInput }
    | undefined {
    const containers = this.commentContainers();
    for (const container of containers) {
      const input = this.findWritableCommentInput(container);
      if (input) {
        return { container, input };
      }
    }
    return this.findWritableCommentInput(document.body)
      ? {
          container: undefined,
          input: this.findWritableCommentInput(
            document.body,
          ) as WritableCommentInput,
        }
      : undefined;
  }

  private commentContainers(): Element[] {
    const selectors = [
      "#comment",
      "#comments",
      "halo-comment",
      "[data-comment]",
      ".comment",
      ".comments",
      ".comment-form",
    ].join(",");
    return [...document.querySelectorAll(selectors)];
  }

  private findCommentArea(): Element | undefined {
    return this.commentContainers()[0];
  }

  private collectHeadings(): Array<{ level: number; text: string }> {
    return [...document.querySelectorAll<HTMLHeadingElement>("h1,h2,h3")]
      .map((heading) => ({
        level: Number(heading.tagName.slice(1)),
        text: (heading.textContent ?? "").trim(),
      }))
      .filter((heading) => heading.text)
      .slice(0, 8);
  }

  private collectFormSummaries(): Array<{
    id?: string;
    name?: string;
    fields: string[];
    submitLabels: string[];
  }> {
    return [...document.querySelectorAll<HTMLFormElement>("form")]
      .map((form) => ({
        id: form.id || undefined,
        name: form.getAttribute("name") || undefined,
        fields: [
          ...form.querySelectorAll<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
          >("input,textarea,select"),
        ]
          .map(
            (field) =>
              field.getAttribute("name") ||
              field.getAttribute("aria-label") ||
              field.id,
          )
          .filter((field): field is string => !!field)
          .slice(0, 12),
        submitLabels: [
          ...form.querySelectorAll<HTMLButtonElement | HTMLInputElement>(
            "button,input[type='submit']",
          ),
        ]
          .map((button) =>
            (
              button.textContent ||
              button.getAttribute("value") ||
              button.getAttribute("aria-label") ||
              ""
            ).trim(),
          )
          .filter((label) => label)
          .slice(0, 6),
      }))
      .slice(0, 6);
  }

  private collectLinkSummaries(): Array<{ text: string; href: string }> {
    return [...document.querySelectorAll<HTMLAnchorElement>("a[href]")]
      .map((link) => ({
        text: (link.textContent ?? "").trim().replace(/\s+/g, " "),
        href: link.href,
      }))
      .filter(
        (link) => link.text && link.href.startsWith(window.location.origin),
      )
      .slice(0, 10);
  }

  private findWritableCommentInput(
    root: ParentNode,
  ): WritableCommentInput | undefined {
    const selectors = [
      "textarea:not([disabled]):not([readonly])",
      "[contenteditable='true']",
      "[contenteditable='']",
      "input[name='content']:not([disabled]):not([readonly])",
      "input[name='comment']:not([disabled]):not([readonly])",
    ];
    for (const selector of selectors) {
      const found = this.deepQuerySelector<WritableCommentInput>(
        root,
        selector,
      );
      if (found && this.isWritableCommentInput(found)) {
        return found;
      }
    }
    return undefined;
  }

  private findCommentSubmitButton(root: ParentNode): HTMLElement | undefined {
    const selectors = [
      "button[type='submit']:not([disabled])",
      "input[type='submit']:not([disabled])",
      "button:not([disabled])",
      "[role='button']:not([aria-disabled='true'])",
    ];
    for (const selector of selectors) {
      const elements = this.deepQuerySelectorAll<HTMLElement>(root, selector);
      const submit = elements.find((element) => {
        const text = `${element.textContent ?? ""} ${
          element.getAttribute("aria-label") ?? ""
        } ${element.getAttribute("value") ?? ""}`.trim();
        return /提交|评论|发送|发布|回复|submit|send|post|reply/i.test(text);
      });
      if (submit) {
        return submit;
      }
    }
    return undefined;
  }

  private deepQuerySelector<T extends Element>(
    root: ParentNode,
    selector: string,
  ): T | undefined {
    return this.deepQuerySelectorAll<T>(root, selector)[0];
  }

  private deepQuerySelectorAll<T extends Element>(
    root: ParentNode,
    selector: string,
  ): T[] {
    const results: T[] = [];
    const visit = (node: ParentNode) => {
      if ("querySelectorAll" in node) {
        results.push(
          ...[
            ...(
              node as Document | DocumentFragment | Element
            ).querySelectorAll<T>(selector),
          ],
        );
        for (const element of [
          ...(node as Document | DocumentFragment | Element).querySelectorAll(
            "*",
          ),
        ]) {
          if (element.shadowRoot) {
            visit(element.shadowRoot);
          }
        }
      }
    };
    visit(root);
    return results;
  }

  private isWritableCommentInput(
    input: Element,
  ): input is WritableCommentInput {
    return (
      input instanceof HTMLTextAreaElement ||
      input instanceof HTMLInputElement ||
      (input instanceof HTMLElement && input.isContentEditable)
    );
  }

  private writeCommentInput(
    input: WritableCommentInput,
    content: string,
  ): void {
    if (
      input instanceof HTMLTextAreaElement ||
      input instanceof HTMLInputElement
    ) {
      const descriptor = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(input),
        "value",
      );
      descriptor?.set?.call(input, content);
    } else {
      input.textContent = content;
    }
    const inputEvent =
      typeof InputEvent === "function"
        ? new InputEvent("input", {
            bubbles: true,
            inputType: "insertText",
            data: content,
          })
        : new Event("input", { bubbles: true });
    input.dispatchEvent(inputEvent);
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

const stringInput = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const failure = (errorCode: string, message: string): AgentToolResult => ({
  ok: false,
  errorCode,
  message,
});

const buttonStyle = (background: string, color: string): string =>
  [
    "border:none",
    "border-radius:999px",
    "padding:.25rem .625rem",
    "font-size:12px",
    "cursor:pointer",
    `background:${background}`,
    `color:${color}`,
  ].join(";");

const isToolPart = (part: UIMessage["parts"][number]): part is ToolPart =>
  part.type.startsWith("tool-");

type WritableCommentInput =
  | HTMLTextAreaElement
  | HTMLInputElement
  | HTMLElement;
