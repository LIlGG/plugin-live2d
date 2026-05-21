import { describe, expect, it, vi, beforeEach } from "vitest";
import { ParameterCoordinator } from "../coordinator";
import { SemanticParameterLayer } from "../../semantic";
import { SystemPriority } from "../types";

function createMockSemanticLayer(): SemanticParameterLayer {
  const layer = new SemanticParameterLayer();
  (layer as unknown as Record<string, unknown>).resolved = new Map([
    ["mouthOpen", { id: "PARAM_MOUTH_OPEN", index: 0 }],
    ["angleX", { id: "PARAM_ANGLE_X", index: 1 }],
    ["eyeLOpen", { id: "PARAM_EYE_L_OPEN", index: 2 }],
  ]);
  const setValueMock = vi.fn();
  (layer as unknown as Record<string, unknown>).accessor = {
    getValue: () => 0,
    setValue: setValueMock,
    getMin: () => -30,
    getMax: () => 30,
  };
  return layer;
}

function getAccessor(layer: SemanticParameterLayer): { setValue: ReturnType<typeof vi.fn> } {
  return (layer as unknown as Record<string, unknown>).accessor as { setValue: ReturnType<typeof vi.fn> };
}

describe("ParameterCoordinator", () => {
  let semanticLayer: SemanticParameterLayer;
  let coordinator: ParameterCoordinator;

  beforeEach(() => {
    semanticLayer = createMockSemanticLayer();
    coordinator = new ParameterCoordinator(semanticLayer);
    semanticLayer.setCoordinator(coordinator);
  });

  describe("queueWrite", () => {
    it("collects writes per parameter", () => {
      coordinator.queueWrite("mouthOpen", 0.5, "override", "fsm", SystemPriority.FSM);
      coordinator.queueWrite("mouthOpen", 0.8, "override", "emotion", SystemPriority.EMOTION);

      // Before flush, accessor should not be called
      const accessor = getAccessor(semanticLayer);
      expect(accessor.setValue).not.toHaveBeenCalled();
    });

    it("applies single write on flush", () => {
      coordinator.queueWrite("mouthOpen", 0.5, "override", "fsm", SystemPriority.FSM);
      coordinator.flush();

      const accessor = getAccessor(semanticLayer);
      expect(accessor.setValue).toHaveBeenCalledWith(0, 0.5);
    });
  });

  describe("conflict detection", () => {
    it("logs conflict when two override sources write same parameter", () => {
      coordinator.queueWrite("mouthOpen", 0.5, "override", "fsm", SystemPriority.FSM);
      coordinator.queueWrite("mouthOpen", 0.8, "override", "emotion", SystemPriority.EMOTION);
      coordinator.flush();

      const log = coordinator.getConflictLog();
      expect(log.length).toBe(1);
      expect(log[0].parameter).toBe("mouthOpen");
      expect(log[0].winningSystem).toBe("fsm");
      expect(log[0].losingSystem).toBe("emotion");
      expect(log[0].winningValue).toBe(0.5);
      expect(log[0].losingValue).toBe(0.8);
    });

    it("highest priority wins (lowest number)", () => {
      // MANUAL=1 should win over all others
      coordinator.queueWrite("mouthOpen", 0.9, "override", "manual", SystemPriority.MANUAL);
      coordinator.queueWrite("mouthOpen", 0.5, "override", "fsm", SystemPriority.FSM);
      coordinator.queueWrite("mouthOpen", 0.3, "override", "emotion", SystemPriority.EMOTION);
      coordinator.flush();

      const accessor = getAccessor(semanticLayer);
      expect(accessor.setValue).toHaveBeenCalledWith(0, 0.9);

      const log = coordinator.getConflictLog();
      // Two conflicts: manual wins over fsm, manual wins over emotion
      expect(log.length).toBe(2);
      expect(log[0].winningSystem).toBe("manual");
      expect(log[1].winningSystem).toBe("manual");
    });

    it("does not log conflict for single source", () => {
      coordinator.queueWrite("mouthOpen", 0.5, "override", "fsm", SystemPriority.FSM);
      coordinator.flush();

      expect(coordinator.getConflictLog()).toEqual([]);
    });

    it("does not log conflict for add blend mode", () => {
      coordinator.queueWrite("mouthOpen", 0.5, "add", "fsm", SystemPriority.FSM);
      coordinator.queueWrite("mouthOpen", 0.3, "add", "emotion", SystemPriority.EMOTION);
      coordinator.flush();

      // Add writes don't conflict, they accumulate
      expect(coordinator.getConflictLog()).toEqual([]);

      const accessor = getAccessor(semanticLayer);
      expect(accessor.setValue).toHaveBeenCalledWith(0, 0.8); // 0.5 + 0.3
    });

    it("combines override and add correctly", () => {
      coordinator.queueWrite("mouthOpen", 0.5, "override", "fsm", SystemPriority.FSM);
      coordinator.queueWrite("mouthOpen", 0.2, "add", "procedural", SystemPriority.PROCEDURAL);
      coordinator.flush();

      // Override wins, then add is added to it
      const accessor = getAccessor(semanticLayer);
      expect(accessor.setValue).toHaveBeenCalledWith(0, 0.7); // 0.5 + 0.2
    });

    it("add-only resolves to sum without override", () => {
      coordinator.queueWrite("mouthOpen", 0.3, "add", "procedural", SystemPriority.PROCEDURAL);
      coordinator.queueWrite("mouthOpen", 0.4, "add", "motion", SystemPriority.MOTION);
      coordinator.flush();

      const accessor = getAccessor(semanticLayer);
      expect(accessor.setValue).toHaveBeenCalledWith(0, 0.7);
    });
  });

  describe("conflict log management", () => {
    it("trims log to max size", () => {
      const smallCoordinator = new ParameterCoordinator(semanticLayer, { maxLogSize: 3 });
      semanticLayer.setCoordinator(smallCoordinator);

      for (let i = 0; i < 5; i++) {
        smallCoordinator.queueWrite("mouthOpen", i * 0.1, "override", `fsm-${i}`, SystemPriority.FSM);
      }
      smallCoordinator.flush();

      const log = smallCoordinator.getConflictLog();
      expect(log.length).toBe(3);
    });

    it("clears log on request", () => {
      coordinator.queueWrite("mouthOpen", 0.5, "override", "fsm", SystemPriority.FSM);
      coordinator.queueWrite("mouthOpen", 0.8, "override", "emotion", SystemPriority.EMOTION);
      coordinator.flush();

      expect(coordinator.getConflictLog().length).toBe(1);

      coordinator.clearConflictLog();
      expect(coordinator.getConflictLog()).toEqual([]);
    });

    it("returns a copy of the log", () => {
      coordinator.queueWrite("mouthOpen", 0.5, "override", "fsm", SystemPriority.FSM);
      coordinator.queueWrite("mouthOpen", 0.8, "override", "emotion", SystemPriority.EMOTION);
      coordinator.flush();

      const log1 = coordinator.getConflictLog();
      log1.push({} as never);
      const log2 = coordinator.getConflictLog();
      expect(log2.length).toBe(1); // Original log unchanged
    });
  });

  describe("per-frame isolation", () => {
    it("clears queue after flush", () => {
      coordinator.queueWrite("mouthOpen", 0.5, "override", "fsm", SystemPriority.FSM);
      coordinator.flush();

      const accessor = getAccessor(semanticLayer);
      const callCount = accessor.setValue.mock.calls.length;

      // Second flush should not apply anything new
      coordinator.flush();
      expect(accessor.setValue).toHaveBeenCalledTimes(callCount);
    });

    it("handles multiple parameters independently", () => {
      coordinator.queueWrite("mouthOpen", 0.5, "override", "fsm", SystemPriority.FSM);
      coordinator.queueWrite("angleX", 10, "override", "emotion", SystemPriority.EMOTION);
      coordinator.flush();

      const accessor = getAccessor(semanticLayer);
      expect(accessor.setValue).toHaveBeenCalledWith(0, 0.5);
      expect(accessor.setValue).toHaveBeenCalledWith(1, 10);
    });
  });
});
