import { escapeHtml } from "@/live2d/helpers/escapeHtml";
import DOMPurify from "dompurify";

// Ordinary tips only need passive text formatting, never embedded content.
export const renderTipMessage = (value: string): string => {
  if (!DOMPurify.isSupported) {
    return escapeHtml(value);
  }
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [
      "span",
      "br",
      "b",
      "strong",
      "em",
      "i",
      "u",
      "s",
      "code",
      "p",
    ],
    ALLOWED_ATTR: [],
    ALLOW_ARIA_ATTR: false,
    ALLOW_DATA_ATTR: false,
  });
};
