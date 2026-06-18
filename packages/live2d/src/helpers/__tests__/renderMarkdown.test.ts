import { describe, expect, it } from "vitest";
import { hasMarkdownBlockElements, renderMarkdown } from "../renderMarkdown";

describe("renderMarkdown", () => {
  it("renders common markdown blocks and inline marks", () => {
    const html = renderMarkdown(
      [
        "## 标题",
        "",
        "这里有 **重点**、`code` 和 [链接](https://example.com?a=1&b=2)。",
        "",
        "- 第一项",
        "- 第二项",
      ].join("\n"),
    );

    expect(html).toContain("<h2>标题</h2>");
    expect(html).toContain("<strong>重点</strong>");
    expect(html).toContain("<code>code</code>");
    expect(html).toContain(
      '<a href="https://example.com?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">链接</a>',
    );
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>第一项</li>");
    expect(html).toContain("<li>第二项</li>");
  });

  it("escapes raw html and unsafe links", () => {
    const html = renderMarkdown(
      "<img src=x onerror=alert(1)> [bad](javascript:alert(1))",
    );

    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("[bad](javascript:alert(1))");
    expect(html).not.toContain("<img");
    expect(html).not.toContain('href="javascript:alert(1)"');
  });

  it("does not auto-link URL-like text", () => {
    const html = renderMarkdown(
      "日志标识 abc.def/very-long-value 不要变成链接",
    );

    expect(html).toContain("abc.def/very-long-value");
    expect(html).not.toContain("<a ");
  });

  it("still renders explicit markdown links", () => {
    expect(renderMarkdown("[Halo](https://www.halo.run)")).toContain(
      '<a href="https://www.halo.run" target="_blank" rel="noopener noreferrer">Halo</a>',
    );
  });

  it("renders fenced code as escaped code blocks", () => {
    const html = renderMarkdown("```ts\nconst a = '<x>';\n```");

    expect(html).toContain('<pre><code class="language-ts">');
    expect(html).toContain("const a = '&lt;x&gt;';");
    expect(html).not.toContain("<x>");
  });

  it("keeps soft line breaks inside paragraphs", () => {
    expect(renderMarkdown("第一行\n第二行")).toContain("第一行<br>\n第二行");
  });

  it("normalizes collapsed chat markdown blocks", () => {
    const html = renderMarkdown(
      "总结一下叭！---##📚内容一览###📝文章：-**【Hello Halo】**—默认欢迎文章###📄页面：-**【关于】**—站点介绍",
    );

    expect(html).toContain("<hr>");
    expect(html).toContain("<h2>📚内容一览</h2>");
    expect(html).toContain("<h3>📝文章：</h3>");
    expect(html).toContain(
      "<li><strong>【Hello Halo】</strong>—默认欢迎文章</li>",
    );
    expect(html).toContain("<h3>📄页面：</h3>");
    expect(html).toContain("<li><strong>【关于】</strong>—站点介绍</li>");
  });

  it("detects markdown block output", () => {
    expect(hasMarkdownBlockElements(renderMarkdown("plain"))).toBe(true);
    expect(hasMarkdownBlockElements("plain")).toBe(false);
  });
});
