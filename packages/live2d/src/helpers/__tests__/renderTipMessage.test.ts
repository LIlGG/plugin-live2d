import DOMPurify from "dompurify";
import { expect, it } from "vitest";
import { renderTipMessage } from "../renderTipMessage";

it("falls back to literal text when HTML sanitization is unsupported", () => {
  const supported = DOMPurify.isSupported;
  const text = '<iframe src="probe" onload="alert(1)"></iframe> & "quote"';
  DOMPurify.isSupported = false;
  try {
    const template = document.createElement("template");
    template.innerHTML = renderTipMessage(text);
    expect(template.content.querySelector("iframe")).toBeNull();
    expect(template.content.textContent).toBe(text);
  } finally {
    DOMPurify.isSupported = supported;
  }
});
