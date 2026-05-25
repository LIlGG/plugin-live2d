import { describe, expect, it } from "vitest";
import { FadeEnvelope } from "../fade-envelope";
import { MotionTrack } from "../motion-track";
import { MotionLayerSystem } from "../motion-layer-system";
import { SemanticParameterLayer } from "../../semantic";

describe("FadeEnvelope", () => {
  it("starts at weight 0", () => {
    const env = new FadeEnvelope();
    expect(env.getWeight()).toBe(0);
    expect(env.isActive()).toBe(false);
  });

  it("fades in to weight 1", () => {
    const env = new FadeEnvelope({ fadeInDuration: 100 });
    env.beginFadeIn();

    env.update(50);
    expect(env.getWeight()).toBeGreaterThan(0);
    expect(env.getWeight()).toBeLessThan(1);

    env.update(50);
    expect(env.getWeight()).toBe(1);
    expect(env.state).toBe("active");
  });

  it("fades out to weight 0", () => {
    const env = new FadeEnvelope({ fadeOutDuration: 100 });
    env.activate();
    expect(env.getWeight()).toBe(1);

    env.beginFadeOut();
    env.update(100);
    expect(env.getWeight()).toBe(0);
    expect(env.isStopped()).toBe(true);
  });
});

describe("MotionTrack", () => {
  it("plays parameters with fade in", () => {
    const track = new MotionTrack({ name: "talk", priority: 3 });
    track.play({
      layer: "talk",
      parameters: { mouthOpen: { value: 0.8 } },
      fadeIn: 100,
    });

    expect(track.getState()).toBe("fadingIn");

    track.update(50);
    const outputs = track.getOutputs();
    expect(outputs.length).toBe(1);
    expect(outputs[0].semantic).toBe("mouthOpen");
    expect(outputs[0].value).toBeGreaterThan(0);
    expect(outputs[0].value).toBeLessThan(0.8);
  });

  it("activates to full weight without fade", () => {
    const track = new MotionTrack({ name: "physics", priority: 0 });
    track.setParameters({ breath: { value: 0.15, blendMode: "add" } });

    expect(track.getWeight()).toBe(1);
    const outputs = track.getOutputs();
    expect(outputs[0].value).toBe(0.15);
    expect(outputs[0].blendMode).toBe("add");
  });

  it("stops with fade out", () => {
    const track = new MotionTrack({ name: "talk", priority: 3 });
    track.play({
      layer: "talk",
      parameters: { mouthOpen: { value: 0.8 } },
      fadeIn: 0,
    });

    // After play with fadeIn=0, track should be active
    track.update(0);
    track.stop(100);
    track.update(100);

    expect(track.getState()).toBe("stopped");
    expect(track.getOutputs().length).toBe(0);
  });
});

describe("MotionLayerSystem", () => {
  function createMockSemanticLayer(): SemanticParameterLayer {
    const layer = new SemanticParameterLayer();
    (layer as unknown as { resolved: Map<string, unknown> }).resolved = new Map([
      ["mouthOpen", { id: "PARAM_MOUTH_OPEN", index: 0 }],
      ["angleX", { id: "PARAM_ANGLE_X", index: 1 }],
      ["breath", { id: "PARAM_BREATH", index: 2 }],
      ["eyeLOpen", { id: "PARAM_EYE_L_OPEN", index: 3 }],
    ]);
    (layer as unknown as { accessor: unknown }).accessor = {
      getValue: () => 0,
      setValue: () => {},
      getMin: () => -30,
      getMax: () => 30,
    };
    return layer;
  }

  it("initializes 5 standard layers", () => {
    const semantic = createMockSemanticLayer();
    const system = new MotionLayerSystem(semantic);

    expect(system.isPlaying("idle")).toBe(false);
    expect(system.isPlaying("physics")).toBe(false);
    expect(system.getActiveLayers()).toEqual([]);
  });

  it("plays on a layer and activates it", () => {
    const semantic = createMockSemanticLayer();
    const system = new MotionLayerSystem(semantic);

    system.play({
      layer: "talk",
      parameters: { mouthOpen: { value: 0.8 } },
      fadeIn: 0,
    });

    expect(system.isPlaying("talk")).toBe(true);
    expect(system.getActiveLayers()).toContain("talk");
  });

  it("higher priority overrides lower on same parameter", () => {
    const semantic = createMockSemanticLayer();
    const system = new MotionLayerSystem(semantic);

    system.play({
      layer: "idle",
      parameters: { angleX: { value: 5 } },
      priority: 1,
      fadeIn: 0,
    });

    system.play({
      layer: "gesture",
      parameters: { angleX: { value: 20 } },
      priority: 4,
      fadeIn: 0,
    });

    system.update(0);

    const statuses = system.getLayerStatuses();
    const gestureStatus = statuses.find((s) => s.name === "gesture");
    expect(gestureStatus?.priority).toBe(4);
  });

  it("crossfades between motions on same layer", () => {
    const semantic = createMockSemanticLayer();
    const system = new MotionLayerSystem(semantic);

    system.play({
      layer: "expression",
      parameters: { mouthOpen: { value: 0.2 } },
      fadeIn: 0,
    });

    system.crossfade("expression", {
      parameters: { mouthOpen: { value: 0.6 } },
      fadeIn: 100,
    });

    expect(system.isPlaying("expression")).toBe(true);
  });

  it("clears all layers", () => {
    const semantic = createMockSemanticLayer();
    const system = new MotionLayerSystem(semantic);

    system.play({
      layer: "talk",
      parameters: { mouthOpen: { value: 0.8 } },
      fadeIn: 0,
    });

    system.clearAll();
    expect(system.getActiveLayers()).toEqual([]);
  });

  it("sets physics parameters directly", () => {
    const semantic = createMockSemanticLayer();
    const system = new MotionLayerSystem(semantic);

    system.setPhysicsParameters({
      breath: { value: 0.15, blendMode: "add" },
    });

    const physics = system.getTrack("physics");
    expect(physics?.isActive()).toBe(true);
    expect(physics?.getOutputs()[0]?.value).toBe(0.15);
  });

  it("stops a layer with fade out", () => {
    const semantic = createMockSemanticLayer();
    const system = new MotionLayerSystem(semantic);

    system.play({
      layer: "talk",
      parameters: { mouthOpen: { value: 0.8 } },
      fadeIn: 0,
    });

    expect(system.isPlaying("talk")).toBe(true);

    system.stop("talk", 100);
    system.update(100);

    expect(system.isPlaying("talk")).toBe(false);
  });
});
