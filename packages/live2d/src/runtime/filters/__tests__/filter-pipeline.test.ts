import { describe, expect, it } from "vitest";
import { FilterPipeline } from "../filter-pipeline";

describe("FilterPipeline", () => {
  it("adds mood lighting effect", () => {
    const pipeline = new FilterPipeline();
    const handle = pipeline.addMoodLighting({ color: "warm", intensity: 0.3 });

    expect(handle.id).toBeDefined();
    expect(pipeline.getEffectCount()).toBe(1);
    expect(pipeline.hasEffects()).toBe(true);
  });

  it("adds blush effect", () => {
    const pipeline = new FilterPipeline();
    const handle = pipeline.addBlush({ intensity: 0.4 });

    expect(handle.id).toBeDefined();
    expect(pipeline.getEffectCount()).toBe(1);
  });

  it("adds glow effect", () => {
    const pipeline = new FilterPipeline();
    const handle = pipeline.addGlow({ intensity: 0.5 });

    expect(handle.id).toBeDefined();
    expect(pipeline.getEffectCount()).toBe(1);
  });

  it("adds color grading effect", () => {
    const pipeline = new FilterPipeline();
    const handle = pipeline.addColorGrading({
      temperature: "cool",
      intensity: 0.2,
    });

    expect(handle.id).toBeDefined();
    expect(pipeline.getEffectCount()).toBe(1);
  });

  it("supports multiple concurrent effects", () => {
    const pipeline = new FilterPipeline();
    pipeline.addMoodLighting({ color: "warm" });
    pipeline.addBlush();
    pipeline.addGlow();

    expect(pipeline.getEffectCount()).toBe(3);
  });

  it("removes effect by handle", () => {
    const pipeline = new FilterPipeline();
    const handle = pipeline.addMoodLighting({ color: "warm" });

    expect(pipeline.getEffectCount()).toBe(1);

    pipeline.remove(handle);
    expect(pipeline.getEffectCount()).toBe(0);
    expect(pipeline.hasEffects()).toBe(false);
  });

  it("adjusts effect intensity dynamically", () => {
    const pipeline = new FilterPipeline();
    const handle = pipeline.addMoodLighting({ color: "warm", intensity: 0.1 });

    pipeline.setIntensity(handle, 0.8);
    // Intensity updated without error
    expect(pipeline.getEffectCount()).toBe(1);
  });

  it("clears all effects", () => {
    const pipeline = new FilterPipeline();
    pipeline.addMoodLighting({ color: "warm" });
    pipeline.addBlush();

    expect(pipeline.getEffectCount()).toBe(2);

    pipeline.clear();
    expect(pipeline.getEffectCount()).toBe(0);
    expect(pipeline.hasEffects()).toBe(false);
  });

  it("supports presets", () => {
    const pipeline = new FilterPipeline();

    const warm = pipeline.applyPreset("evening-warm");
    expect(warm.id).toBeDefined();
    expect(pipeline.getEffectCount()).toBe(1);

    pipeline.clear();

    const cool = pipeline.applyPreset("morning-cool");
    expect(cool.id).toBeDefined();

    pipeline.clear();

    const neutral = pipeline.applyPreset("neutral");
    expect(neutral.id).toBeDefined();
  });

  it("skips expensive effects on low quality", () => {
    const pipeline = new FilterPipeline({ quality: "low" });
    pipeline.addGlow({ intensity: 0.5 });

    // Glow is considered expensive, so it should be skipped on low quality
    expect(pipeline.getEffectCount()).toBe(0);
  });

  it("allows effects on high quality", () => {
    const pipeline = new FilterPipeline({ quality: "high" });
    pipeline.addGlow({ intensity: 0.5 });

    expect(pipeline.getEffectCount()).toBe(1);
  });

  it("ignores removing non-existent effect", () => {
    const pipeline = new FilterPipeline();
    // Should not throw
    pipeline.remove("non-existent-id");
    expect(pipeline.getEffectCount()).toBe(0);
  });

  it("falls back to full-model filtering when part targeting is unavailable", () => {
    const pipeline = new FilterPipeline();
    const handle = pipeline.applyPresetToPart("happy-glow", /eye/);

    // Should still create an effect (fallback to full model)
    expect(handle.id).toBeDefined();
    expect(pipeline.getEffectCount()).toBe(1);
  });

  it("reports part-level targeting unavailable without model", () => {
    const pipeline = new FilterPipeline();
    expect(pipeline.isPartLevelTargetingAvailable()).toBe(false);
  });
});
