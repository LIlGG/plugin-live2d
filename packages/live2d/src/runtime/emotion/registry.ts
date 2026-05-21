import type { EmotionName, EmotionProfile } from "./types";

export const EMOTION_REGISTRY: Record<EmotionName, EmotionProfile> = {
  neutral: {
    parameters: {
      mouthSmile: 0,
      mouthOpen: 0,
      mouthForm: 0,
      eyeLOpen: 1,
      eyeROpen: 1,
      eyeLSmile: 0,
      eyeRSmile: 0,
      cheek: 0,
      browLY: 0,
      browRY: 0,
      browLAngle: 0,
      browRAngle: 0,
      angleX: 0,
      angleY: 0,
      breath: 0,
    },
    idleTimeout: 0,
  },

  happy: {
    parameters: {
      mouthSmile: 0.6,
      mouthOpen: 0.2,
      eyeLSmile: 0.5,
      eyeRSmile: 0.5,
      cheek: 0.2,
      browLY: -0.1,
      browRY: -0.1,
      eyeLOpen: 0.9,
      eyeROpen: 0.9,
    },
    filterPreset: "happy-glow",
    filterIntensity: 0.4,
    idleTimeout: 3000,
  },

  sad: {
    parameters: {
      browLY: 0.3,
      browRY: 0.3,
      mouthForm: -0.3,
      eyeLOpen: 0.8,
      eyeROpen: 0.8,
      mouthSmile: 0,
      angleY: 0.1,
    },
    filterPreset: "morning-cool",
    filterIntensity: 0.2,
    idleTimeout: 4000,
  },

  angry: {
    parameters: {
      browLY: 0.4,
      browRY: 0.4,
      browLAngle: -0.3,
      browRAngle: 0.3,
      mouthForm: -0.2,
      cheek: 0.15,
      eyeLOpen: 0.85,
      eyeROpen: 0.85,
      mouthOpen: 0.1,
    },
    filterPreset: "angry-red",
    filterIntensity: 0.4,
    idleTimeout: 3000,
  },

  embarrassed: {
    parameters: {
      cheek: 0.5,
      eyeLOpen: 0.7,
      eyeROpen: 0.7,
      browLY: 0.1,
      browRY: 0.1,
      mouthSmile: 0.2,
      angleX: 0.05,
    },
    filterPreset: "shy-blush",
    filterIntensity: 0.35,
    idleTimeout: 2500,
  },

  surprised: {
    parameters: {
      eyeLOpen: 1.0,
      eyeROpen: 1.0,
      mouthOpen: 0.6,
      browLY: -0.3,
      browRY: -0.3,
      mouthForm: 0.2,
    },
    filterPreset: "neutral",
    filterIntensity: 0.1,
    idleTimeout: 2000,
  },

  sleepy: {
    parameters: {
      eyeLOpen: 0.4,
      eyeROpen: 0.4,
      browLY: 0.15,
      browRY: 0.15,
      mouthForm: 0.05,
      angleY: 0.1,
      breath: 0.2,
    },
    idleTimeout: 5000,
  },

  thinking: {
    parameters: {
      browLY: -0.2,
      browRY: -0.2,
      eyeLOpen: 0.85,
      eyeROpen: 0.85,
      mouthForm: 0.1,
      angleX: 0.1,
    },
    idleTimeout: 3000,
  },
};

export function getDefaultEmotionProfile(
  name: EmotionName,
): EmotionProfile | undefined {
  return EMOTION_REGISTRY[name];
}
