import type { Live2dTips } from "@/live2d/components/Live2dTips";
import { createDefaultLive2dConfig } from "@/live2d/config/default-config";
import type { TipConfig } from "@/live2d/context/config-context";
import { BeforeInitEvent } from "@/live2d/events/before-init";
import { MODEL_READY_EVENT_NAME } from "@/live2d/events/model-ready";
import { loadMergedTips } from "@/live2d/helpers/loadMergedTips";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import "@/live2d/components/Live2dTips";

vi.mock("@/live2d/helpers/loadMergedTips", () => ({
  loadMergedTips: vi.fn(),
}));

const originalTitle = document.title;
const originalPath = location.href;
const pageTitle = '<iframe src="about:blank" onload="alert(1)"></iframe> & $&';
const elementText = '<img src="probe" onerror="alert(1)"> & $& $$';
const tipConfig: TipConfig = {
  click: [
    { selector: "#click-target", text: "<span>{text}</span> / <b>{text}</b>" },
  ],
  mouseover: [
    { selector: "#hover-target", text: "<span>{text}</span> / <b>{text}</b>" },
  ],
  seasons: [],
  time: [],
  message: { default: [] },
};

const initialize = async (firstOpenSite = false) => {
  vi.mocked(loadMergedTips).mockResolvedValue(tipConfig);
  const tips = document.createElement("live2d-tips") as Live2dTips;
  document.body.append(tips);
  await tips.updateComplete;
  window.dispatchEvent(
    new BeforeInitEvent({
      config: {
        ...createDefaultLive2dConfig(),
        firstOpenSite,
        openConsole: false,
      },
    }),
  );
  await Promise.resolve();
  await Promise.resolve();
  return tips;
};

describe("tip event text interpolation", () => {
  beforeAll(async () => {
    document.title = pageTitle;
    history.replaceState({}, "", "/posts/issue86");
    await import("../tip-events");
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  afterAll(() => {
    document.title = originalTitle;
    history.replaceState({}, "", originalPath);
    vi.restoreAllMocks();
  });

  it("renders the actual page title as text inside the welcome formatting", async () => {
    const tips = await initialize(true);
    window.dispatchEvent(new CustomEvent(MODEL_READY_EVENT_NAME));
    await tips.updateComplete;
    const message = tips.shadowRoot?.querySelector("#live2d-tips");

    expect(message?.querySelector("iframe")).toBeNull();
    expect(message?.querySelector("span")?.textContent).toBe(
      `「${pageTitle}」`,
    );
    expect(message?.textContent).toContain(`欢迎阅读「${pageTitle}」`);
  });

  it.each([
    ["click", "click-target"],
    ["mouseover", "hover-target"],
  ])(
    "renders every {text} placeholder literally on %s",
    async (eventName, id) => {
      const tips = await initialize();
      const target = document.createElement("button");
      target.id = id;
      target.textContent = elementText;
      // jsdom does not compute layout-dependent innerText.
      Object.defineProperty(target, "innerText", { value: elementText });
      document.body.append(target);
      target.dispatchEvent(
        new MouseEvent(eventName, { bubbles: true, composed: true }),
      );
      await tips.updateComplete;
      const message = tips.shadowRoot?.querySelector("#live2d-tips");

      expect(message?.querySelector("img")).toBeNull();
      expect(message?.querySelector("span")?.textContent).toBe(elementText);
      expect(message?.querySelector("b")?.textContent).toBe(elementText);
      expect(message?.textContent).toContain(`${elementText} / ${elementText}`);
    },
  );
});
