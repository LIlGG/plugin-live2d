import type { Live2dCanvas } from "@/live2d/components/Live2dCanvas";
import { createDefaultLive2dConfig } from "@/live2d/config/default-config";
import { MODEL_READY_EVENT_NAME } from "@/live2d/events/model-ready";
import Model from "@/live2d/live2d/model";
import {
  clearCurrentLive2dModel,
  getCurrentLive2dModel,
} from "@/live2d/live2d/model-store";
import { createLive2d } from "@/live2d/live2d/runtime";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../Live2dCanvas";

vi.mock("@/live2d/live2d/model", () => ({
  default: { create: vi.fn() },
}));
vi.mock("@/live2d/components/Live2dContext", () => ({}));

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

const createModel = () =>
  ({
    destroy: vi.fn(),
    resize: vi.fn().mockResolvedValue(undefined),
  }) as unknown as Model;

const mountCanvas = async (parent: HTMLElement = document.body) => {
  const canvas = document.createElement("live2d-canvas") as Live2dCanvas;
  canvas.config = createDefaultLive2dConfig();
  parent.append(canvas);
  await canvas.updateComplete;
  return canvas;
};

describe("Live2dCanvas model lifecycle", () => {
  const onReady = vi.fn();

  beforeEach(() => {
    clearCurrentLive2dModel();
    vi.mocked(Model.create).mockReset();
    onReady.mockClear();
    window.addEventListener(MODEL_READY_EVENT_NAME, onReady);
  });

  afterEach(() => {
    document.body.replaceChildren();
    window.removeEventListener(MODEL_READY_EVENT_NAME, onReady);
    clearCurrentLive2dModel();
    vi.restoreAllMocks();
  });

  it("publishes a loaded model and destroys it when disconnected", async () => {
    const model = createModel();
    vi.mocked(Model.create).mockResolvedValue(model);
    const canvas = await mountCanvas();
    await vi.waitFor(() => expect(canvas.getModel()).toBe(model));

    expect(getCurrentLive2dModel()).toBe(model);
    expect(onReady).toHaveBeenCalledOnce();
    canvas.remove();
    expect(model.destroy).toHaveBeenCalledOnce();
    expect(canvas.getModel()).toBeNull();
    expect(getCurrentLive2dModel()).toBeNull();
  });

  it("disposes a model that finishes loading after mobile display is disabled", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("iPhone");
    const pending = deferred<Model>();
    const model = createModel();
    vi.mocked(Model.create).mockReturnValue(pending.promise);
    const runtime = createLive2d();
    runtime.init("/assets/", { showOnMobile: true });
    const root = document.getElementById("plugin-live2d-root");
    expect(root).not.toBeNull();
    if (!root) throw new Error("Expected the runtime to mount a root");
    const canvas = await mountCanvas(root);
    expect(Model.create).toHaveBeenCalledOnce();

    runtime.init("/assets/", { showOnMobile: false });
    expect(canvas.isConnected).toBe(false);
    pending.resolve(model);
    await vi.waitFor(() => expect(model.destroy).toHaveBeenCalledOnce());

    expect(canvas.getModel()).toBeNull();
    expect(getCurrentLive2dModel()).toBeNull();
    expect(onReady).not.toHaveBeenCalled();
  });

  it("preserves another canvas's active model when an unloaded canvas disconnects", async () => {
    const pending = deferred<Model>();
    const activeModel = createModel();
    const lateModel = createModel();
    vi.mocked(Model.create)
      .mockResolvedValueOnce(activeModel)
      .mockReturnValueOnce(pending.promise);
    const activeCanvas = await mountCanvas();
    await vi.waitFor(() => expect(activeCanvas.getModel()).toBe(activeModel));
    const loadingCanvas = await mountCanvas();

    loadingCanvas.remove();
    expect(getCurrentLive2dModel()).toBe(activeModel);
    pending.resolve(lateModel);
    await vi.waitFor(() => expect(lateModel.destroy).toHaveBeenCalledOnce());
    expect(getCurrentLive2dModel()).toBe(activeModel);
    expect(activeModel.destroy).not.toHaveBeenCalled();
    expect(onReady).toHaveBeenCalledOnce();
  });

  it("reconnects with a fresh canvas and discards the earlier pending model", async () => {
    const pending = deferred<Model>();
    const lateModel = createModel();
    const currentModel = createModel();
    vi.mocked(Model.create)
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(currentModel);
    const canvas = await mountCanvas();
    canvas.remove();
    document.body.append(canvas);
    await vi.waitFor(() => expect(canvas.getModel()).toBe(currentModel));
    expect(vi.mocked(Model.create).mock.calls[0][0]).not.toBe(
      vi.mocked(Model.create).mock.calls[1][0],
    );
    pending.resolve(lateModel);
    await vi.waitFor(() => expect(lateModel.destroy).toHaveBeenCalledOnce());
    expect(canvas.getModel()).toBe(currentModel);
    expect(getCurrentLive2dModel()).toBe(currentModel);
    expect(currentModel.destroy).not.toHaveBeenCalled();
    expect(onReady).toHaveBeenCalledOnce();
  });

  it("resizes a loading model to the latest canvas size before publishing it", async () => {
    const pending = deferred<Model>();
    const model = createModel();
    vi.mocked(Model.create).mockReturnValue(pending.promise);
    const canvas = await mountCanvas();
    canvas.canvasSize = 240;
    await canvas.updateComplete;
    pending.resolve(model);

    await vi.waitFor(() => expect(canvas.getModel()).toBe(model));
    expect(model.resize).toHaveBeenCalledWith(240);
    expect(getCurrentLive2dModel()).toBe(model);
    canvas.canvasSize = 300;
    await canvas.updateComplete;
    expect(model.resize).toHaveBeenLastCalledWith(300);
  });

  it("disposes a model disconnected while its initial resize is pending", async () => {
    const pending = deferred<Model>();
    const resizing = deferred<void>();
    const model = createModel();
    vi.mocked(model.resize).mockReturnValue(resizing.promise);
    vi.mocked(Model.create).mockReturnValue(pending.promise);
    const canvas = await mountCanvas();
    canvas.canvasSize = 240;
    await canvas.updateComplete;
    pending.resolve(model);
    await vi.waitFor(() => expect(model.resize).toHaveBeenCalledOnce());

    canvas.remove();
    resizing.resolve();
    await vi.waitFor(() => expect(model.destroy).toHaveBeenCalledOnce());
    expect(canvas.getModel()).toBeNull();
    expect(getCurrentLive2dModel()).toBeNull();
    expect(onReady).not.toHaveBeenCalled();
  });

  it("applies further size changes while the initial resize is pending", async () => {
    const pending = deferred<Model>();
    const resizing = deferred<void>();
    const model = createModel();
    vi.mocked(model.resize).mockReturnValueOnce(resizing.promise);
    vi.mocked(Model.create).mockReturnValue(pending.promise);
    const canvas = await mountCanvas();
    canvas.canvasSize = 240;
    await canvas.updateComplete;
    pending.resolve(model);
    await vi.waitFor(() => expect(model.resize).toHaveBeenCalledWith(240));

    canvas.canvasSize = 300;
    await canvas.updateComplete;
    resizing.resolve();
    await vi.waitFor(() => expect(canvas.getModel()).toBe(model));
    expect(model.resize).toHaveBeenLastCalledWith(300);
    expect(getCurrentLive2dModel()).toBe(model);
    expect(onReady).toHaveBeenCalledOnce();
  });
});
