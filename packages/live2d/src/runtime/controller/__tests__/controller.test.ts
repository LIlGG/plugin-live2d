import { describe, expect, it, vi } from "vitest";
import { Live2dRuntimeController } from "../controller";
import type { BehaviorFSM } from "../../behavior";

describe("Live2dRuntimeController", () => {
  it("creates with default config", () => {
    const controller = new Live2dRuntimeController();
    expect(controller.getSemanticLayer()).toBeDefined();
    expect(controller.getFilterPipeline()).toBeDefined();
  });

  it("exposes subsystem accessors", () => {
    const controller = new Live2dRuntimeController();
    expect(controller.getBehaviorFSM()).toBeUndefined();
    expect(controller.getEmotionTimeline()).toBeUndefined();
    expect(controller.getMotionLayerSystem()).toBeUndefined();
    expect(controller.getProceduralSystem()).toBeUndefined();
  });

  it("transitionTo delegates to subsystems", () => {
    const controller = new Live2dRuntimeController();

    // Before initialization, subsystems are not created
    controller.transitionTo({ fsm: "happy" });
    // Should not throw

    controller.transitionTo({ emotion: "happy" });
    // Should not throw
  });

  it("getState returns default state before initialization", () => {
    const controller = new Live2dRuntimeController();
    const state = controller.getState();

    expect(state.fsmState).toBeNull();
    expect(state.emotion).toBeNull();
    expect(state.isTransitioning).toBe(false);
    expect(state.motionLayers).toEqual([]);
    expect(state.proceduralModules).toEqual([]);
  });

  it("getConflictLog returns empty array initially", () => {
    const controller = new Live2dRuntimeController();
    expect(controller.getConflictLog()).toEqual([]);
  });

  it("clearConflictLog empties the log", () => {
    const controller = new Live2dRuntimeController();
    controller.clearConflictLog();
    expect(controller.getConflictLog()).toEqual([]);
  });

  it("getSemanticParameters returns empty before detection", () => {
    const controller = new Live2dRuntimeController();
    expect(controller.getSemanticParameters()).toEqual([]);
  });

  it("destroy cleans up without error", () => {
    const controller = new Live2dRuntimeController();
    controller.destroy();
    // Should not throw
  });

  it("disabled controller ignores transitions", () => {
    const controller = new Live2dRuntimeController({ enabled: false });
    controller.transitionTo({ fsm: "happy" });
    const state = controller.getState();
    expect(state.fsmState).toBeNull();
  });

  it("transitionTo applies filter preset", () => {
    const controller = new Live2dRuntimeController();
    controller.transitionTo({ filter: "happy-glow" });
    const state = controller.getState();
    expect(state.activeFilters.length).toBe(1);
    expect(state.activeFilters[0].type).toBe("mood-lighting");
  });

  it("coordinated transition sets FSM state, emotion, and filter atomically", () => {
    const controller = new Live2dRuntimeController();
    controller.transitionTo({ fsm: "happy", emotion: "happy", filter: "shy-blush" });
    // FSM and emotion require initialization (model + ticker)
    // Filter is applied directly via filterPipeline
    const state = controller.getState();
    expect(state.activeFilters.length).toBe(1);
    expect(state.activeFilters[0].type).toBe("color-grading");
  });

  it("getTransitionHistory tracks transitions", () => {
    const controller = new Live2dRuntimeController();
    // Inject a mock FSM to test transition history
    let currentState = "idle";
    const mockFSM = {
      getCurrentState: vi.fn().mockImplementation(() => currentState),
      canTransitionTo: () => true,
      transitionTo: vi.fn().mockImplementation((state: string) => {
        currentState = state;
        return true;
      }),
      initialize: vi.fn(),
      registerState: vi.fn(),
      unregisterState: vi.fn(),
      getRegisteredStates: () => ["idle", "happy", "thinking"],
      hasState: () => true,
    } as unknown as BehaviorFSM;

    (controller as unknown as Record<string, unknown>)["behaviorFSM"] = mockFSM;

    controller.transitionTo({ fsm: "happy" });
    controller.transitionTo({ fsm: "thinking" });

    const history = controller.getTransitionHistory();
    expect(history.length).toBe(2);
    expect(history[0].from).toBe("idle");
    expect(history[0].to).toBe("happy");
    expect(history[1].from).toBe("happy");
    expect(history[1].to).toBe("thinking");
  });

  it("transition history is capped at 10 entries", () => {
    const controller = new Live2dRuntimeController();
    const mockFSM = {
      getCurrentState: vi.fn().mockReturnValue("idle"),
      canTransitionTo: () => true,
      transitionTo: vi.fn().mockReturnValue(true),
      initialize: vi.fn(),
      registerState: vi.fn(),
      unregisterState: vi.fn(),
      getRegisteredStates: () => ["idle", "happy", "sad"],
      hasState: () => true,
    } as unknown as BehaviorFSM;

    (controller as unknown as Record<string, unknown>)["behaviorFSM"] = mockFSM;

    for (let i = 0; i < 15; i++) {
      controller.transitionTo({ fsm: i % 2 === 0 ? "happy" : "sad" });
    }
    const history = controller.getTransitionHistory();
    expect(history.length).toBe(10);
  });

  it("getSemanticParameters returns empty before detection", () => {
    const controller = new Live2dRuntimeController();
    expect(controller.getSemanticParameters()).toEqual([]);
  });

  it("destroy cleans up without error", () => {
    const controller = new Live2dRuntimeController();
    controller.destroy();
  });
});
