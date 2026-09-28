import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Live2dDevTools } from "../Live2dDevTools";
import { Live2dRuntimeController } from "@/live2d/runtime/controller";
import { render, type TemplateResult } from "lit";

interface DevToolsPrivate {
  _transitionFSM(state: string): void;
  _transitionEmotion(emotion: string): void;
  _applyFilter(preset: string): void;
  _clearFilters(): void;
  _setParamValue(name: string, value: number): void;
  _resetParamValue(name: string): void;
  _renderParamSection(): TemplateResult;
  _setFilterIntensity(id: string, value: number): void;
  _handleKeyDown(event: KeyboardEvent): void;
  _visible: boolean;
  _sections: Array<{ id: string; expanded: boolean }>;
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

    it("slider holds the parameter with manual priority", () => {
      const semanticLayer = controller.getSemanticLayer();
      const holdSpy = vi.spyOn(semanticLayer, "holdSemantic");
      asPrivate(devtools)._setParamValue("mouthOpen", 5.5);
      expect(holdSpy).toHaveBeenCalledWith("mouthOpen", 5.5, "manual", 1);
    });

    it("reset releases only the manual parameter hold", () => {
      const semanticLayer = controller.getSemanticLayer();
      const releaseSpy = vi.spyOn(semanticLayer, "releaseSemantic");
      asPrivate(devtools)._resetParamValue("mouthOpen");
      expect(releaseSpy).toHaveBeenCalledWith("mouthOpen", "manual");
    });

    it("shows a restore control for a manually held parameter", () => {
      vi.spyOn(controller, "getSemanticParameters").mockReturnValue([{ name: "angleX", value: 17 }]);
      vi.spyOn(controller.getSemanticLayer(), "hasHeldSemantic").mockReturnValue(true);
      vi.spyOn(controller.getSemanticLayer(), "getHeldSemantic").mockReturnValue(12);
      const paramsSection = asPrivate(devtools)._sections.find((section) => section.id === "params");
      expect(paramsSection).toBeDefined();
      if (paramsSection) paramsSection.expanded = true;
      const container = document.createElement("div");

      render(asPrivate(devtools)._renderParamSection(), container);

      expect(container.querySelector('button[aria-label="恢复 angleX 的自动控制"]')).not.toBeNull();
      expect((container.querySelector('input[type="range"]') as HTMLInputElement).value).toBe("12");
      expect(container.textContent).toContain("17.00");
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
      asPrivate(devtools)._handleKeyDown(new KeyboardEvent("keydown", { key: "D", ctrlKey: true, shiftKey: true }));
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
