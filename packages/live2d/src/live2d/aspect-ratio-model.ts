import "@/live2d/libs/live2d.min.js";
import "@/live2d/libs/live2dcubismcore.min.js";
import {
  Live2DModel,
  type Live2DModelOptions,
} from "untitled-pixi-live2d-engine";

export class AspectRatioLive2DModel extends Live2DModel {
  constructor(options?: Live2DModelOptions) {
    super(options);
    this.once("settingsLoaded", (settings) => {
      if (!("layout" in settings)) return;
      const layout = settings.layout;
      if (!layout || typeof layout !== "object" || Array.isArray(layout))
        return;

      const widthKey =
        "Width" in layout || "Height" in layout ? "Width" : "width";
      const heightKey = widthKey === "Width" ? "Height" : "height";
      const dimensions = layout as Record<string, unknown>;
      const width = dimensions[widthKey];
      const height = dimensions[heightKey];
      if ((width === undefined) === (height === undefined)) return;
      if (
        (dimensions.width !== undefined || dimensions.Width !== undefined) &&
        (dimensions.height !== undefined || dimensions.Height !== undefined)
      )
        return;

      const size = width ?? height;
      if (typeof size !== "number" || !Number.isFinite(size) || size <= 0)
        return;

      // The engine defaults each missing dimension to 2, which distorts models
      // with a single layout dimension. Use the same scale on both axes.
      settings.layout = { ...layout, [widthKey]: size, [heightKey]: size };
    });
  }
}
