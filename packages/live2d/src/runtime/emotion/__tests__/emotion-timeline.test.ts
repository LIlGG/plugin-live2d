import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { EmotionTimeline } from "../timeline";
import { EMOTION_REGISTRY } from "../registry";
import type { EmotionTimelineContext } from "../types";

describe("EmotionTimeline", () => {
  function createMockContext(): EmotionTimelineContext {
    return {
      semanticLayer: {
        setSemantic: vi.fn(),
        getSemantic: vi.fn(() => 0),
        hasSemantic: vi.fn(() => true),
      } as unknown as NonNullable<EmotionTimelineContext["semanticLayer"]>,
      filterPipeline: {
        applyPreset: vi.fn(() => ({ id: "fx-test" })),
        remove: vi.fn(),
        setIntensity: vi.fn(),
      } as unknown as NonNullable<EmotionTimelineContext["filterPipeline"]>,
      motionLayerSystem: {
        play: vi.fn(),
      } as unknown as NonNullable<EmotionTimelineContext["motionLayerSystem"]>,
    };
  }

  function registerDefaults(timeline: EmotionTimeline): void {
    for (const [name, profile] of Object.entries(EMOTION_REGISTRY)) {
      timeline.registerEmotion(name, profile);
    }
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("registration", () => {
    it("registers and retrieves emotion profiles", () => {
      const timeline = new EmotionTimeline(createMockContext());
      timeline.registerEmotion("test", {
        parameters: { mouthOpen: 0.5 },
      });

      const profile = timeline.getEmotionProfile("test");
      expect(profile).toBeDefined();
      expect(profile?.parameters.mouthOpen).toBe(0.5);
    });
  });

  describe("transitionTo", () => {
    it("transitions to a registered emotion", () => {
      const ctx = createMockContext();
      const timeline = new EmotionTimeline(ctx);
      registerDefaults(timeline);

      timeline.transitionTo("happy");
      expect(timeline.getCurrentEmotion()).toBe("neutral");
      expect(timeline.isTransitioning()).toBe(true);
    });

    it("is a no-op for unknown emotions", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const ctx = createMockContext();
      const timeline = new EmotionTimeline(ctx);
      registerDefaults(timeline);

      timeline.transitionTo("nonexistent");
      expect(timeline.isTransitioning()).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("is a no-op when transitioning to the same emotion", () => {
      const ctx = createMockContext();
      const timeline = new EmotionTimeline(ctx, {
        defaultDuration: 100,
        minDuration: 0,
      });
      registerDefaults(timeline);

      timeline.transitionTo("happy");
      vi.advanceTimersByTime(150);
      timeline.update();
      expect(timeline.getCurrentEmotion()).toBe("happy");
      expect(timeline.isTransitioning()).toBe(false);

      // Same emotion, no transition
      timeline.transitionTo("happy");
      expect(timeline.isTransitioning()).toBe(false);
    });

    it("enforces minimum transition duration", () => {
      const ctx = createMockContext();
      const timeline = new EmotionTimeline(ctx, {
        defaultDuration: 50,
        minDuration: 300,
      });
      registerDefaults(timeline);

      timeline.transitionTo("happy", { duration: 50 });

      // At 100ms (past requested 50ms but before min 300ms)
      vi.advanceTimersByTime(100);
      timeline.update();
      expect(timeline.isTransitioning()).toBe(true);

      // At 350ms (past min 300ms)
      vi.advanceTimersByTime(250);
      timeline.update();
      expect(timeline.isTransitioning()).toBe(false);
      expect(timeline.getCurrentEmotion()).toBe("happy");
    });
  });

  describe("interpolation", () => {
    it("interpolates parameter values during transition", () => {
      const ctx = createMockContext();
      const timeline = new EmotionTimeline(ctx, {
        defaultDuration: 100,
        minDuration: 0,
        defaultEasing: "linear",
      });
      registerDefaults(timeline);

      timeline.transitionTo("happy");
      vi.advanceTimersByTime(50);
      timeline.update();

      // Should have called motion layer play with interpolated values
      expect(ctx.motionLayerSystem!.play).toHaveBeenCalled();
    });

    it("uses current value as start when interrupted", () => {
      const ctx = createMockContext();
      const timeline = new EmotionTimeline(ctx, {
        defaultDuration: 200,
        minDuration: 0,
        defaultEasing: "linear",
      });
      registerDefaults(timeline);

      // Start transition to happy
      timeline.transitionTo("happy");
      vi.advanceTimersByTime(100);
      timeline.update();

      const callsBefore = (ctx.motionLayerSystem!.play as ReturnType<typeof vi.fn>)
        .mock.calls.length;

      // Interrupt with sad at 100ms (mid-transition)
      timeline.transitionTo("sad");
      vi.advanceTimersByTime(10);
      timeline.update();

      const callsAfter = (ctx.motionLayerSystem!.play as ReturnType<typeof vi.fn>)
        .mock.calls.length;
      expect(callsAfter).toBeGreaterThan(callsBefore);
    });

    it("interpolates correctly at 50% progress", () => {
      const ctx = createMockContext();
      const timeline = new EmotionTimeline(ctx, {
        defaultDuration: 200,
        minDuration: 0,
        defaultEasing: "linear",
      });
      registerDefaults(timeline);

      timeline.transitionTo("happy");
      vi.advanceTimersByTime(100);
      timeline.update();

      // At 50% linear interpolation, mouthSmile should be ~0.3
      const calls = (ctx.motionLayerSystem!.play as ReturnType<typeof vi.fn>)
        .mock.calls;
      const lastCall = calls[calls.length - 1];
      const params = lastCall?.[0].parameters as Record<
        string,
        { value: number }
      >;
      expect(params?.mouthSmile?.value).toBeGreaterThan(0.2);
      expect(params?.mouthSmile?.value).toBeLessThan(0.4);
    });
  });

  describe("filter integration", () => {
    it("applies filter preset when transition completes", () => {
      const ctx = createMockContext();
      const timeline = new EmotionTimeline(ctx, {
        defaultDuration: 100,
        minDuration: 0,
      });
      registerDefaults(timeline);

      timeline.transitionTo("happy");
      vi.advanceTimersByTime(150);
      timeline.update();

      expect(ctx.filterPipeline!.applyPreset).toHaveBeenCalledWith("happy-glow");
    });

    it("removes filter when transitioning to neutral", () => {
      const ctx = createMockContext();
      const timeline = new EmotionTimeline(ctx, {
        defaultDuration: 100,
        minDuration: 0,
      });
      registerDefaults(timeline);

      // Transition to happy
      timeline.transitionTo("happy");
      vi.advanceTimersByTime(150);
      timeline.update();
      expect(ctx.filterPipeline!.applyPreset).toHaveBeenCalledWith("happy-glow");

      // Transition to neutral
      timeline.transitionTo("neutral");
      vi.advanceTimersByTime(150);
      timeline.update();
      expect(ctx.filterPipeline!.remove).toHaveBeenCalled();
    });

    it("sets filter intensity when specified", () => {
      const ctx = createMockContext();
      const timeline = new EmotionTimeline(ctx, {
        defaultDuration: 100,
        minDuration: 0,
      });
      registerDefaults(timeline);

      timeline.transitionTo("happy");
      vi.advanceTimersByTime(150);
      timeline.update();

      expect(ctx.filterPipeline!.setIntensity).toHaveBeenCalledWith(
        expect.objectContaining({ id: "fx-test" }),
        0.4,
      );
    });
  });

  describe("idle timeout", () => {
    it("auto-returns to neutral after idle timeout", () => {
      const ctx = createMockContext();
      const timeline = new EmotionTimeline(ctx, {
        defaultDuration: 100,
        minDuration: 0,
      });
      registerDefaults(timeline);
      // Override happy's idleTimeout with a short one for testing
      timeline.registerEmotion("happy", {
        parameters: { mouthSmile: 0.6 },
        idleTimeout: 200,
      });

      timeline.transitionTo("happy");
      vi.advanceTimersByTime(150);
      timeline.update();
      expect(timeline.getCurrentEmotion()).toBe("happy");

      // Wait for idle timeout
      vi.advanceTimersByTime(300);
      timeline.update();
      expect(timeline.getCurrentEmotion()).toBe("neutral");
    });
  });

  describe("disabled", () => {
    it("blocks transitions when disabled", () => {
      const ctx = createMockContext();
      const timeline = new EmotionTimeline(ctx, { enabled: false });
      registerDefaults(timeline);

      timeline.transitionTo("happy");
      expect(timeline.isTransitioning()).toBe(false);
    });
  });

  describe("full cycle", () => {
    it("transitions neutral -> happy -> sad -> neutral", () => {
      const ctx = createMockContext();
      const timeline = new EmotionTimeline(ctx, {
        defaultDuration: 100,
        minDuration: 0,
        defaultEasing: "linear",
      });
      registerDefaults(timeline);

      // neutral -> happy
      timeline.transitionTo("happy");
      vi.advanceTimersByTime(150);
      timeline.update();
      expect(timeline.getCurrentEmotion()).toBe("happy");
      expect(ctx.filterPipeline!.applyPreset).toHaveBeenCalledWith("happy-glow");

      // happy -> sad
      timeline.transitionTo("sad");
      vi.advanceTimersByTime(150);
      timeline.update();
      expect(timeline.getCurrentEmotion()).toBe("sad");

      // sad -> neutral
      timeline.transitionTo("neutral");
      vi.advanceTimersByTime(150);
      timeline.update();
      expect(timeline.getCurrentEmotion()).toBe("neutral");
    });
  });

  describe("destroy", () => {
    it("cleans up filter handle on destroy", () => {
      const ctx = createMockContext();
      const timeline = new EmotionTimeline(ctx, {
        defaultDuration: 100,
        minDuration: 0,
      });
      registerDefaults(timeline);

      timeline.transitionTo("happy");
      vi.advanceTimersByTime(150);
      timeline.update();

      timeline.destroy();
      expect(ctx.filterPipeline!.remove).toHaveBeenCalled();
    });
  });
});
