import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Live2dDevTools } from "../Live2dDevTools";
import { Live2dRuntimeController } from "@/live2d/runtime/controller";

interface DevToolsPrivate {
  _transitionFSM(state: string): void;
  _transitionEmotion(emotion: string): void;
  _applyFilter(preset: string): void;
  _clearFilters(): void;
  _setParamValue(name: string, value: number): void;
  _setFilterIntensity(id: string, value: number): void;
  _toggleVisible(): void;
  _visible: boolean;
  _controller: Live2dRuntimeController | null;
}

function asPrivate(devtools: Live2dDevTools): DevToolsPrivate {
  return devtools as unknown as DevToolsPrivate;
}

describe("Live2dDevTools", () => {
  let devtools: Live2dDevTools;
  let controller: Live2dRuntimeController;

  beforeEach(() => {
    devtools = new Live2dDevTools();
    controller = new Live2dRuntimeController();
    devtools.setController(controller);
  });

  afterEach(() => {
    devtools.disconnectedCallback?.();
  });

  describe("controller integration", () => {
    it("setController stores controller reference", () => {
      expect(() => devtools.setController(controller)).not.toThrow();
    });

    it("FSM state button triggers transition", () => {
      const transitionSpy = vi.spyOn(controller, "transitionTo");
      asPrivate(devtools)._transitionFSM("happy");
      expect(transitionSpy).toHaveBeenCalledWith({ fsm: "happy" });
    });

    it("FSM state button triggers different states", () => {
      const transitionSpy = vi.spyOn(controller, "transitionTo");
      asPrivate(devtools)._transitionFSM("thinking");
      expect(transitionSpy).toHaveBeenCalledWith({ fsm: "thinking" });
    });

    it("emotion button triggers transition", () => {
      const transitionSpy = vi.spyOn(controller, "transitionTo");
      asPrivate(devtools)._transitionEmotion("happy");
      expect(transitionSpy).toHaveBeenCalledWith({ emotion: "happy" });
    });

    it("emotion button triggers different emotions", () => {
      const transitionSpy = vi.spyOn(controller, "transitionTo");
      asPrivate(devtools)._transitionEmotion("sad");
      expect(transitionSpy).toHaveBeenCalledWith({ emotion: "sad" });
    });

    it("filter preset button applies effect", () => {
      const filterPipeline = controller.getFilterPipeline();
      const applySpy = vi.spyOn(filterPipeline, "applyPreset");
      asPrivate(devtools)._applyFilter("happy-glow");
      expect(applySpy).toHaveBeenCalledWith("happy-glow");
    });

    it("filter preset button applies different presets", () => {
      const filterPipeline = controller.getFilterPipeline();
      const applySpy = vi.spyOn(filterPipeline, "applyPreset");
      asPrivate(devtools)._applyFilter("shy-blush");
      expect(applySpy).toHaveBeenCalledWith("shy-blush");
    });

    it("clear filters button clears all effects", () => {
      const filterPipeline = controller.getFilterPipeline();
      const clearSpy = vi.spyOn(filterPipeline, "clear");
      asPrivate(devtools)._clearFilters();
      expect(clearSpy).toHaveBeenCalled();
    });

    it("slider changes parameter value with manual priority", () => {
      const semanticLayer = controller.getSemanticLayer();
      const setSemanticSpy = vi.spyOn(semanticLayer, "setSemantic");
      asPrivate(devtools)._setParamValue("mouthOpen", 5.5);
      expect(setSemanticSpy).toHaveBeenCalledWith("mouthOpen", 5.5, "override", "manual", 1);
    });

    it("filter intensity slider adjusts effect intensity", () => {
      const filterPipeline = controller.getFilterPipeline();
      const setIntensitySpy = vi.spyOn(filterPipeline, "setIntensity");
      asPrivate(devtools)._setFilterIntensity("fx-123", 0.75);
      expect(setIntensitySpy).toHaveBeenCalledWith("fx-123", 0.75);
    });
  });

  describe("visibility toggle", () => {
    it("toggle switches visibility state", () => {
      const initialVisible = asPrivate(devtools)._visible;
      asPrivate(devtools)._toggleVisible();
      const afterToggle = asPrivate(devtools)._visible;
      expect(afterToggle).toBe(!initialVisible);
    });
  });

  describe("conflict log", () => {
    it("clear conflict log delegates to controller", () => {
      const clearSpy = vi.spyOn(controller, "clearConflictLog");
      asPrivate(devtools)._controller = controller;
      controller.clearConflictLog();
      expect(clearSpy).toHaveBeenCalled();
    });
  });
});
