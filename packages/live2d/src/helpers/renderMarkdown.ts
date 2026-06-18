import MarkdownIt from "markdown-it";

const BLOCK_TAGS = new Set([
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "ol",
  "p",
  "pre",
  "table",
  "ul",
]);

const markdown = new MarkdownIt({
  breaks: true,
  html: false,
  linkify: false,
  typographer: false,
});

const defaultLinkOpenRenderer =
  markdown.renderer.rules.link_open ??
  ((tokens, idx, options, _env, self) =>
    self.renderToken(tokens, idx, options));

markdown.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const href = token.attrGet("href");
  if (href && !markdown.validateLink(href)) {
    token.attrSet("href", "");
  }
  token.attrSet("target", "_blank");
  token.attrSet("rel", "noopener noreferrer");
  return defaultLinkOpenRenderer(tokens, idx, options, env, self);
};

export const renderMarkdown = (value: string): string => markdown.render(value);

export const hasMarkdownBlockElements = (html: string): boolean => {
  const match = html.trimStart().match(/^<([a-z0-9]+)/i);
  return match ? BLOCK_TAGS.has(match[1]) : false;
};
