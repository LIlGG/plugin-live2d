import { buildProfile } from "./profile";
import type { BehaviorProfile, BehaviorState } from "./types";

// ── Base profile ──────────────────────────────────────────────

const baseProfile: BehaviorProfile = {
  motionLayers: {
    idle: {
      parameters: {
        breath: { value: 0.3, blendMode: "add" },
      },
      fadeIn: 500,
    },
  },
};

// ── Individual state profiles ─────────────────────────────────

const idleProfile: BehaviorProfile = buildProfile(baseProfile, {
  motionLayers: {
    idle: {
      parameters: {
        breath: { value: 0.3, blendMode: "add" },
      },
      fadeIn: 800,
    },
  },
});

const happyProfile: BehaviorProfile = buildProfile(baseProfile, {
  motionLayers: {
    expression: {
      parameters: {
        mouthSmile: { value: 0.6, blendMode: "override" },
        eyeLSmile: { value: 0.5, blendMode: "override" },
        eyeRSmile: { value: 0.5, blendMode: "override" },
        cheek: { value: 0.2, blendMode: "add" },
        browLY: { value: -0.1, blendMode: "override" },
        browRY: { value: -0.1, blendMode: "override" },
      },
      fadeIn: 400,
    },
  },
  filters: ["happy-glow"],
});

const sadProfile: BehaviorProfile = buildProfile(baseProfile, {
  motionLayers: {
    expression: {
      parameters: {
        browLY: { value: 0.3, blendMode: "override" },
        browRY: { value: 0.3, blendMode: "override" },
        mouthForm: { value: -0.3, blendMode: "override" },
      },
      fadeIn: 600,
    },
  },
  filters: ["morning-cool"],
});

const angryProfile: BehaviorProfile = buildProfile(baseProfile, {
  motionLayers: {
    expression: {
      parameters: {
        browLY: { value: 0.4, blendMode: "override" },
        browRY: { value: 0.4, blendMode: "override" },
        browLAngle: { value: -0.3, blendMode: "override" },
        browRAngle: { value: 0.3, blendMode: "override" },
        mouthForm: { value: -0.2, blendMode: "override" },
        cheek: { value: 0.15, blendMode: "add" },
      },
      fadeIn: 300,
    },
  },
  filters: ["angry-red"],
});

const embarrassedProfile: BehaviorProfile = buildProfile(baseProfile, {
  motionLayers: {
    expression: {
      parameters: {
        cheek: { value: 0.5, blendMode: "override" },
        browLY: { value: 0.1, blendMode: "override" },
        browRY: { value: 0.1, blendMode: "override" },
        mouthSmile: { value: 0.2, blendMode: "override" },
      },
      fadeIn: 500,
    },
  },
  filters: ["shy-blush"],
});

const thinkingProfile: BehaviorProfile = buildProfile(baseProfile, {
  motionLayers: {
    expression: {
      parameters: {
        browLY: { value: -0.2, blendMode: "override" },
        browRY: { value: -0.2, blendMode: "override" },
        mouthForm: { value: 0.1, blendMode: "override" },
      },
      fadeIn: 600,
    },
    gesture: {
      parameters: {
        armLA: { value: 0.3, blendMode: "override" },
      },
      fadeIn: 800,
    },
  },
});

const talkingProfile: BehaviorProfile = buildProfile(baseProfile, {
  motionLayers: {
    talk: {
      parameters: {
        mouthOpen: { value: 0.5, blendMode: "override" },
        mouthForm: { value: 0.2, blendMode: "override" },
      },
      fadeIn: 200,
    },
  },
});

const sleepyProfile: BehaviorProfile = buildProfile(baseProfile, {
  motionLayers: {
    expression: {
      parameters: {
        browLY: { value: 0.15, blendMode: "override" },
        browRY: { value: 0.15, blendMode: "override" },
        mouthForm: { value: 0.05, blendMode: "override" },
      },
      fadeIn: 1000,
    },
  },
});

// ── Built-in state definitions ────────────────────────────────

export const builtInStates: BehaviorState[] = [
  {
    name: "idle",
    entryProfile: idleProfile,
    debounceMs: 0,
  },
  {
    name: "happy",
    entryProfile: happyProfile,
    debounceMs: 200,
  },
  {
    name: "sad",
    entryProfile: sadProfile,
    debounceMs: 300,
  },
  {
    name: "angry",
    entryProfile: angryProfile,
    debounceMs: 300,
  },
  {
    name: "embarrassed",
    entryProfile: embarrassedProfile,
    debounceMs: 200,
  },
  {
    name: "thinking",
    entryProfile: thinkingProfile,
    debounceMs: 200,
  },
  {
    name: "talking",
    entryProfile: talkingProfile,
    debounceMs: 100,
  },
  {
    name: "sleepy",
    entryProfile: sleepyProfile,
    debounceMs: 500,
  },
];

/**
 * Register all built-in states on a BehaviorFSM instance.
 */
export function registerBuiltInStates(
  register: (state: BehaviorState) => void,
): void {
  for (const state of builtInStates) {
    register(state);
  }
}
