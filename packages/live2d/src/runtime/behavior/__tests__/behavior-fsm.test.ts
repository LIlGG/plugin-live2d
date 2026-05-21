import { describe, expect, it, vi } from "vitest";
import { BehaviorFSM } from "../fsm";
import { mergeProfiles, buildProfile } from "../profile";
import type { BehaviorState, BehaviorProfile, BehaviorContext } from "../types";

describe("BehaviorFSM", () => {
  function createMockContext(): BehaviorContext {
    return {
      motionLayerSystem: {
        play: vi.fn(),
        stop: vi.fn(),
        isPlaying: vi.fn(() => false),
        getActiveLayers: vi.fn(() => []),
      } as unknown as NonNullable<BehaviorContext["motionLayerSystem"]>,
      filterPipeline: {
        applyPreset: vi.fn((preset) => ({ id: `handle-${preset}` })),
        remove: vi.fn(),
        clear: vi.fn(),
        getEffectCount: vi.fn(() => 0),
      } as unknown as NonNullable<BehaviorContext["filterPipeline"]>,
      semanticLayer: {
        setSemantic: vi.fn(),
        getSemantic: vi.fn(() => 0),
        hasSemantic: vi.fn(() => true),
        getCapabilityProfile: vi.fn(() => ({
          detected: new Map(),
          missing: [],
          notApplicable: [],
        })),
      } as unknown as NonNullable<BehaviorContext["semanticLayer"]>,
      proceduralSystem: {
        enableModule: vi.fn(),
        disableModule: vi.fn(),
        getModuleStatuses: vi.fn(() => [
          { name: "breathing", enabled: true },
          { name: "blink", enabled: true },
          { name: "eyeTracking", enabled: true },
        ]),
      } as unknown as NonNullable<BehaviorContext["proceduralSystem"]>,
    };
  }

  describe("state registration", () => {
    it("registers and unregisters states", () => {
      const fsm = new BehaviorFSM(createMockContext());
      const state: BehaviorState = { name: "test" };

      fsm.registerState(state);
      expect(fsm.hasState("test")).toBe(true);
      expect(fsm.getRegisteredStates()).toContain("test");

      fsm.unregisterState("test");
      expect(fsm.hasState("test")).toBe(false);
    });
  });

  describe("transitionTo", () => {
    it("transitions to a registered state", () => {
      const fsm = new BehaviorFSM(createMockContext());
      fsm.registerState({ name: "idle" });
      fsm.registerState({ name: "happy" });

      fsm.initialize();
      expect(fsm.getCurrentState()).toBe("idle");

      const result = fsm.transitionTo("happy");
      expect(result).toBe(true);
      expect(fsm.getCurrentState()).toBe("happy");
    });

    it("returns false for unregistered state", () => {
      const fsm = new BehaviorFSM(createMockContext());
      fsm.registerState({ name: "idle" });
      fsm.initialize();

      const result = fsm.transitionTo("nonexistent");
      expect(result).toBe(false);
      expect(fsm.getCurrentState()).toBe("idle");
    });

    it("is a no-op when transitioning to the same state", () => {
      const fsm = new BehaviorFSM(createMockContext());
      fsm.registerState({ name: "idle" });
      fsm.initialize();

      const result = fsm.transitionTo("idle");
      expect(result).toBe(false);
      expect(fsm.getCurrentState()).toBe("idle");
    });
  });

  describe("transition guards", () => {
    it("allows transition when guard returns true", () => {
      const fsm = new BehaviorFSM(createMockContext());
      fsm.registerState({ name: "idle" });
      fsm.registerState({
        name: "happy",
        transitionGuard: () => true,
      });
      fsm.initialize();

      const result = fsm.transitionTo("happy");
      expect(result).toBe(true);
      expect(fsm.getCurrentState()).toBe("happy");
    });

    it("blocks transition when guard returns false", () => {
      const fsm = new BehaviorFSM(createMockContext());
      fsm.registerState({ name: "idle" });
      fsm.registerState({
        name: "sleepy",
        transitionGuard: () => false,
      });
      fsm.initialize();

      const result = fsm.transitionTo("sleepy");
      expect(result).toBe(false);
      expect(fsm.getCurrentState()).toBe("idle");
    });

    it("passes from and to state names to guard", () => {
      const guard = vi.fn(() => true);
      const fsm = new BehaviorFSM(createMockContext());
      fsm.registerState({ name: "idle" });
      fsm.registerState({ name: "happy", transitionGuard: guard });
      fsm.initialize();

      fsm.transitionTo("happy");
      expect(guard).toHaveBeenCalledWith("idle", "happy");
    });
  });

  describe("canTransitionTo", () => {
    it("returns true for valid transition", () => {
      const fsm = new BehaviorFSM(createMockContext());
      fsm.registerState({ name: "idle" });
      fsm.registerState({ name: "happy" });
      fsm.initialize();

      expect(fsm.canTransitionTo("happy")).toBe(true);
    });

    it("returns false for same state", () => {
      const fsm = new BehaviorFSM(createMockContext());
      fsm.registerState({ name: "idle" });
      fsm.initialize();

      expect(fsm.canTransitionTo("idle")).toBe(false);
    });

    it("returns false when guard blocks", () => {
      const fsm = new BehaviorFSM(createMockContext());
      fsm.registerState({ name: "idle" });
      fsm.registerState({
        name: "sleepy",
        transitionGuard: () => false,
      });
      fsm.initialize();

      expect(fsm.canTransitionTo("sleepy")).toBe(false);
    });
  });

  describe("entry profile application", () => {
    it("applies motion layer effects on state entry", () => {
      const ctx = createMockContext();
      const fsm = new BehaviorFSM(ctx);
      fsm.registerState({
        name: "talking",
        entryProfile: {
          motionLayers: {
            talk: {
              parameters: { mouthOpen: { value: 0.5 } },
              fadeIn: 200,
            },
          },
        },
      });

      fsm.transitionTo("talking");

      expect(ctx.motionLayerSystem!.play).toHaveBeenCalledWith({
        layer: "talk",
        parameters: { mouthOpen: { value: 0.5 } },
        fadeIn: 200,
      });
    });

    it("applies filters on state entry", () => {
      const ctx = createMockContext();
      const fsm = new BehaviorFSM(ctx);
      fsm.registerState({
        name: "happy",
        entryProfile: {
          filters: ["happy-glow"],
        },
      });

      fsm.transitionTo("happy");

      expect(ctx.filterPipeline!.applyPreset).toHaveBeenCalledWith("happy-glow");
    });

    it("applies semantic parameters on state entry", () => {
      const ctx = createMockContext();
      const fsm = new BehaviorFSM(ctx);
      fsm.registerState({
        name: "happy",
        entryProfile: {
          semanticParameters: {
            mouthSmile: { value: 0.6, blendMode: "override" },
          },
        },
      });

      fsm.transitionTo("happy");

      expect(ctx.semanticLayer!.setSemantic).toHaveBeenCalledWith(
        "mouthSmile",
        0.6,
        "override",
        "fsm",
        2,
      );
    });

    it("applies procedural overrides on state entry", () => {
      const ctx = createMockContext();
      const fsm = new BehaviorFSM(ctx);
      fsm.registerState({
        name: "sleepy",
        entryProfile: {
          proceduralOverrides: { Blink: false },
        },
      });

      fsm.transitionTo("sleepy");

      expect(ctx.proceduralSystem!.disableModule).toHaveBeenCalledWith("Blink");
    });
  });

  describe("exit profile reversal", () => {
    it("reverts motion layers on state exit", () => {
      const ctx = createMockContext();
      const fsm = new BehaviorFSM(ctx);
      fsm.registerState({
        name: "idle",
        entryProfile: {
          motionLayers: {
            idle: {
              parameters: { breath: { value: 0.3 } },
              fadeIn: 500,
            },
          },
        },
      });
      fsm.registerState({ name: "happy" });

      fsm.transitionTo("idle");
      fsm.transitionTo("happy");

      expect(ctx.motionLayerSystem!.stop).toHaveBeenCalledWith("idle");
    });

    it("removes filters on state exit", () => {
      const ctx = createMockContext();
      const fsm = new BehaviorFSM(ctx);
      fsm.registerState({
        name: "happy",
        entryProfile: {
          filters: ["happy-glow"],
        },
      });
      fsm.registerState({ name: "idle" });

      fsm.transitionTo("happy");
      fsm.transitionTo("idle");

      expect(ctx.filterPipeline!.remove).toHaveBeenCalledWith("handle-happy-glow");
    });

    it("resets semantic parameters on state exit", () => {
      const ctx = createMockContext();
      const fsm = new BehaviorFSM(ctx);
      fsm.registerState({
        name: "happy",
        entryProfile: {
          semanticParameters: {
            mouthSmile: { value: 0.6 },
          },
        },
      });
      fsm.registerState({ name: "idle" });

      fsm.transitionTo("happy");
      fsm.transitionTo("idle");

      expect(ctx.semanticLayer!.setSemantic).toHaveBeenCalledWith(
        "mouthSmile",
        0,
        "override",
        "fsm",
        2,
      );
    });

    it("reverts procedural overrides on state exit", () => {
      const ctx = createMockContext();
      const fsm = new BehaviorFSM(ctx);
      fsm.registerState({
        name: "sleepy",
        entryProfile: {
          proceduralOverrides: { Blink: false },
        },
      });
      fsm.registerState({ name: "idle" });

      fsm.transitionTo("sleepy");
      fsm.transitionTo("idle");

      // Blink should be re-enabled (default was true)
      expect(ctx.proceduralSystem!.enableModule).toHaveBeenCalledWith("Blink");
    });

    it("uses explicit exitProfile when provided", () => {
      const ctx = createMockContext();
      const fsm = new BehaviorFSM(ctx);
      fsm.registerState({
        name: "idle",
        entryProfile: {
          motionLayers: {
            idle: {
              parameters: { breath: { value: 0.3 } },
            },
          },
        },
        exitProfile: {
          motionLayers: {
            idle: {
              parameters: { breath: { value: 0 } },
            },
          },
        },
      });
      fsm.registerState({ name: "talking" });

      fsm.transitionTo("idle");
      fsm.transitionTo("talking");

      // exitProfile should revert the idle layer
      expect(ctx.motionLayerSystem!.stop).toHaveBeenCalledWith("idle");
    });
  });

  describe("entry/exit hooks", () => {
    it("calls onEnter hook when entering state", () => {
      const onEnter = vi.fn();
      const ctx = createMockContext();
      const fsm = new BehaviorFSM(ctx);
      fsm.registerState({ name: "idle" });
      fsm.registerState({ name: "happy", onEnter });

      fsm.initialize();
      fsm.transitionTo("happy");

      expect(onEnter).toHaveBeenCalledWith(ctx);
    });

    it("calls onExit hook when exiting state", () => {
      const onExit = vi.fn();
      const ctx = createMockContext();
      const fsm = new BehaviorFSM(ctx);
      fsm.registerState({ name: "idle", onExit });
      fsm.registerState({ name: "happy" });

      fsm.initialize();
      fsm.transitionTo("happy");

      expect(onExit).toHaveBeenCalledWith(ctx);
    });
  });

  describe("transition debounce", () => {
    it("prevents rapid state switching", () => {
      const fsm = new BehaviorFSM(createMockContext(), { defaultDebounceMs: 500 });
      fsm.registerState({ name: "idle" });
      fsm.registerState({ name: "happy" });
      fsm.registerState({ name: "sad" });
      fsm.initialize();

      expect(fsm.transitionTo("happy")).toBe(true);
      expect(fsm.transitionTo("sad")).toBe(false); // debounced
    });

    it("allows transitions after debounce period", () => {
      const fsm = new BehaviorFSM(createMockContext(), { defaultDebounceMs: 50 });
      fsm.registerState({ name: "idle" });
      fsm.registerState({ name: "happy" });
      fsm.registerState({ name: "sad" });
      fsm.initialize();

      expect(fsm.transitionTo("happy")).toBe(true);

      // Wait for debounce
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(fsm.transitionTo("sad")).toBe(true);
          resolve(undefined);
        }, 60);
      });
    });

    it("uses per-state debounce when configured", () => {
      const fsm = new BehaviorFSM(createMockContext(), { defaultDebounceMs: 0 });
      fsm.registerState({ name: "idle" });
      fsm.registerState({ name: "happy", debounceMs: 500 });
      fsm.registerState({ name: "sad" });
      fsm.initialize();

      expect(fsm.transitionTo("happy")).toBe(true);
      expect(fsm.transitionTo("sad")).toBe(false); // blocked by happy's debounce
    });
  });

  describe("disabled FSM", () => {
    it("blocks all transitions when disabled", () => {
      const fsm = new BehaviorFSM(createMockContext(), { enabled: false });
      fsm.registerState({ name: "idle" });
      fsm.registerState({ name: "happy" });
      fsm.initialize();

      expect(fsm.canTransitionTo("happy")).toBe(false);
      expect(fsm.transitionTo("happy")).toBe(false);
    });
  });

  describe("full state cycle", () => {
    it("transitions through idle → happy → embarrassed → idle", () => {
      const ctx = createMockContext();
      const fsm = new BehaviorFSM(ctx);

      fsm.registerState({
        name: "idle",
        entryProfile: {
          motionLayers: {
            idle: {
              parameters: { breath: { value: 0.3 } },
              fadeIn: 800,
            },
          },
        },
        debounceMs: 0,
      });
      fsm.registerState({
        name: "happy",
        entryProfile: {
          filters: ["happy-glow"],
          semanticParameters: {
            mouthSmile: { value: 0.6 },
          },
        },
        debounceMs: 0,
      });
      fsm.registerState({
        name: "embarrassed",
        entryProfile: {
          filters: ["shy-blush"],
          semanticParameters: {
            cheek: { value: 0.5 },
          },
        },
        debounceMs: 0,
      });

      // idle -> happy
      fsm.transitionTo("idle");
      expect(fsm.getCurrentState()).toBe("idle");
      expect(ctx.motionLayerSystem!.play).toHaveBeenCalledWith(
        expect.objectContaining({ layer: "idle" }),
      );

      fsm.transitionTo("happy");
      expect(fsm.getCurrentState()).toBe("happy");
      expect(ctx.filterPipeline!.applyPreset).toHaveBeenCalledWith("happy-glow");

      // happy -> embarrassed
      fsm.transitionTo("embarrassed");
      expect(fsm.getCurrentState()).toBe("embarrassed");
      // happy's filter should be removed
      expect(ctx.filterPipeline!.remove).toHaveBeenCalledWith("handle-happy-glow");
      // embarrassed's filter should be applied
      expect(ctx.filterPipeline!.applyPreset).toHaveBeenCalledWith("shy-blush");

      // embarrassed -> idle
      fsm.transitionTo("idle");
      expect(fsm.getCurrentState()).toBe("idle");
      // embarrassed's filter should be removed
      expect(ctx.filterPipeline!.remove).toHaveBeenCalledWith("handle-shy-blush");
    });
  });
});

describe("Profile merging", () => {
  it("merges two profiles with override precedence", () => {
    const base: BehaviorProfile = {
      motionLayers: {
        idle: {
          parameters: { breath: { value: 0.1 } },
          fadeIn: 500,
        },
      },
      semanticParameters: {
        browLY: { value: 0.2 },
      },
    };

    const override: BehaviorProfile = {
      motionLayers: {
        idle: {
          parameters: { breath: { value: 0.2 } },
        },
      },
      semanticParameters: {
        mouthSmile: { value: 0.5 },
      },
    };

    const merged = mergeProfiles(base, override);

    expect(merged.motionLayers?.idle?.parameters.breath.value).toBe(0.2);
    expect(merged.motionLayers?.idle?.fadeIn).toBe(500); // from base
    expect(merged.semanticParameters?.browLY?.value).toBe(0.2); // from base
    expect(merged.semanticParameters?.mouthSmile?.value).toBe(0.5);
  });

  it("combines filter arrays", () => {
    const base: BehaviorProfile = { filters: ["neutral"] };
    const override: BehaviorProfile = { filters: ["happy-glow"] };

    const merged = mergeProfiles(base, override);
    expect(merged.filters).toEqual(["neutral", "happy-glow"]);
  });

  it("builds profile with multiple overrides", () => {
    const base: BehaviorProfile = {
      semanticParameters: { breath: { value: 0.1 } },
    };
    const o1: BehaviorProfile = {
      semanticParameters: { browLY: { value: 0.2 } },
    };
    const o2: BehaviorProfile = {
      semanticParameters: { mouthSmile: { value: 0.5 } },
    };

    const result = buildProfile(base, o1, o2);

    expect(result.semanticParameters?.breath?.value).toBe(0.1);
    expect(result.semanticParameters?.browLY?.value).toBe(0.2);
    expect(result.semanticParameters?.mouthSmile?.value).toBe(0.5);
  });
});
