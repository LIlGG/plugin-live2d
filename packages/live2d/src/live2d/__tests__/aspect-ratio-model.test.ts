import "../aspect-ratio-model";
import { Matrix } from "pixi.js";
import {
  CubismInternalModel,
  CubismLegacyInternalModel,
  CubismLegacyModelSettings,
  CubismModelSettings,
  InternalModel,
  Live2DFactory,
  type Live2DModel,
  type ModelSettings,
} from "untitled-pixi-live2d-engine";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AspectRatioLive2DModel } from "../aspect-ratio-model";

// Layout does not use audio; jsdom has no audio context for @pixi/sound.
vi.hoisted(async () => {
  const { sound } = await import("@pixi/sound");
  Object.defineProperty(sound, "disableAutoPause", {
    value: false,
    writable: true,
  });
});

const options = {
  autoUpdate: false,
  autoFocus: false,
  autoHitTest: false,
  autoInteract: false,
};

const formats = [
  {
    name: "Cubism 2",
    width: "width",
    height: "height",
    center: "center_x",
    prototype: CubismLegacyInternalModel.prototype,
    settings: (layout?: object) =>
      new CubismLegacyModelSettings({
        url: "https://example.com/model.json",
        model: "model.moc",
        textures: ["texture.png"],
        layout,
      }),
  },
  {
    name: "Cubism 3+",
    width: "Width",
    height: "Height",
    center: "CenterX",
    prototype: CubismInternalModel.prototype,
    settings: (Layout?: object) =>
      new CubismModelSettings({
        url: "https://example.com/model.model3.json",
        FileReferences: { Moc: "model.moc3", Textures: ["texture.png"] },
        Layout,
      }),
  },
];

function loadSettings(settings: ModelSettings) {
  const model = new AspectRatioLive2DModel(options);
  model.emit("settingsLoaded", settings);
  model.removeAllListeners();
}

function applyEngineLayout(settings: ModelSettings, prototype: object) {
  const internal = Object.assign(Object.create(prototype), {
    settings,
    getSize: () => [100, 200],
    localTransform: new Matrix(),
  }) as InternalModel;
  const setupLayout = Reflect.get(InternalModel.prototype, "setupLayout") as (
    this: InternalModel,
  ) => void;
  setupLayout.call(internal);
  return internal;
}

afterEach(() => vi.restoreAllMocks());

describe.each(formats)("$name layout", (format) => {
  it.each(["width", "height"] as const)(
    "preserves the model aspect ratio with only %s set",
    (dimension) => {
      const layout = { [format[dimension]]: 1, [format.center]: 0.25 };
      const settings = format.settings(layout);
      loadSettings(settings);

      const internal = applyEngineLayout(settings, format.prototype);
      expect(internal.width).toBe(50);
      expect(internal.height).toBe(100);
      expect(internal.localTransform.a).toBe(internal.localTransform.d);
      expect(internal.localTransform.tx).toBe(12.5);
      expect(settings.layout).toEqual({
        ...layout,
        [format.width]: 1,
        [format.height]: 1,
      });
      expect(layout).not.toHaveProperty(
        format[dimension === "width" ? "height" : "width"],
      );
    },
  );

  it.each([undefined, {}, { [format.center]: 0.25 }])(
    "keeps default dimensions when neither dimension is set: %j",
    (layout) => {
      const settings = format.settings(layout);
      loadSettings(settings);
      expect(settings.layout).toBe(layout);
      const internal = applyEngineLayout(settings, format.prototype);
      expect([internal.width, internal.height]).toEqual([100, 200]);
    },
  );

  it("keeps both explicitly configured dimensions", () => {
    const layout = { [format.width]: 1, [format.height]: 3 };
    const settings = format.settings(layout);
    loadSettings(settings);
    expect(settings.layout).toBe(layout);
    const internal = applyEngineLayout(settings, format.prototype);
    expect([internal.width, internal.height]).toEqual([50, 300]);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, "1", null])(
    "does not propagate an invalid single dimension: %j",
    (size) => {
      const layout = { [format.width]: size };
      const settings = format.settings(layout);
      loadSettings(settings);
      expect(settings.layout).toBe(layout);
    },
  );
});

it.each([
  { Width: 1, height: 3 },
  { width: 1, Height: 3 },
])("keeps explicit modern dimensions with mixed casing: %j", (layout) => {
  const settings = formats[1].settings(layout);
  loadSettings(settings);
  expect(settings.layout).toBe(layout);
  const internal = applyEngineLayout(settings, formats[1].prototype);
  expect([internal.width, internal.height]).toEqual([50, 300]);
});

it("registers the layout hook before the inherited factory loads settings", async () => {
  const settings = formats[1].settings({ Width: 1 });
  const source = "https://example.com/model.model3.json";
  const setup = vi
    .spyOn(Live2DFactory, "setupLive2DModel")
    .mockImplementation(async (model: Live2DModel) => {
      model.emit("settingsLoaded", settings);
      expect(settings.layout).toEqual({ Width: 1, Height: 1 });
    });

  const model = await AspectRatioLive2DModel.from(source, options);
  expect(model).toBeInstanceOf(AspectRatioLive2DModel);
  expect(setup).toHaveBeenCalledWith(model, source, options);
  model.removeAllListeners();
});
