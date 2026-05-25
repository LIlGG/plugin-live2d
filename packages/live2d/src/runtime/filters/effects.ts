import { BlurFilter, ColorMatrixFilter } from "pixi.js";
import type {
  BlushOptions,
  ColorGradingOptions,
  EffectIntensity,
  FilterEffect,
  GlowOptions,
  MoodLightingOptions,
} from "./types";

/** 4x5 color matrix used by PixiJS ColorMatrixFilter. */
type ColorMatrix = [
  number, number, number, number, number,
  number, number, number, number, number,
  number, number, number, number, number,
  number, number, number, number, number,
];

const IDENTITY_MATRIX: ColorMatrix = [
  1, 0, 0, 0, 0,
  0, 1, 0, 0, 0,
  0, 0, 1, 0, 0,
  0, 0, 0, 1, 0,
];

function lerpMatrix(base: ColorMatrix, intensity: EffectIntensity): ColorMatrix {
  const result = new Array<number>(20);
  for (let i = 0; i < 20; i++) {
    result[i] = IDENTITY_MATRIX[i] + (base[i] - IDENTITY_MATRIX[i]) * intensity;
  }
  return result as unknown as ColorMatrix;
}

export class MoodLightingEffect implements FilterEffect {
  readonly id: string;
  readonly name = "氛围光照";
  readonly type = "mood-lighting";
  readonly filter: ColorMatrixFilter;
  intensity: EffectIntensity;
  private baseMatrix: ColorMatrix;

  constructor(options: MoodLightingOptions & { id: string }) {
    this.id = options.id;
    this.filter = new ColorMatrixFilter();
    this.intensity = options.intensity ?? 0.3;
    this.baseMatrix = this.createMatrixForColor(options.color);
    this.applyIntensity();
  }

  setIntensity(value: EffectIntensity): void {
    this.intensity = Math.max(0, Math.min(1, value));
    this.applyIntensity();
  }

  destroy(): void {
    this.filter.destroy();
  }

  private applyIntensity(): void {
    this.filter.matrix = lerpMatrix(this.baseMatrix, this.intensity);
  }

  private createMatrixForColor(color: MoodLightingOptions["color"]): ColorMatrix {
    switch (color) {
      case "warm":
        // Increase red, slightly decrease blue for warm glow
        return [
          1.15, 0, 0, 0, 0,
          0, 1.05, 0, 0, 0,
          0, 0, 0.85, 0, 0,
          0, 0, 0, 1, 0,
        ];
      case "cool":
        // Increase blue, slightly decrease red for cool tone
        return [
          0.9, 0, 0, 0, 0,
          0, 1.0, 0, 0, 0,
          0, 0, 1.15, 0, 0,
          0, 0, 0, 1, 0,
        ];
      case "neutral":
      default:
        // Slight brightness boost
        return [
          1.05, 0, 0, 0, 0,
          0, 1.05, 0, 0, 0,
          0, 0, 1.05, 0, 0,
          0, 0, 0, 1, 0,
        ];
    }
  }
}

export class BlushEffect implements FilterEffect {
  readonly id: string;
  readonly name = "害羞红晕";
  readonly type = "blush";
  readonly filter: BlurFilter;
  intensity: EffectIntensity;
  private readonly baseStrength: number;

  constructor(options: BlushOptions & { id: string }) {
    this.id = options.id;
    this.baseStrength = 4;
    this.filter = new BlurFilter({
      strength: 0, // Start at 0, will be set by intensity
    });
    this.intensity = options.intensity ?? 0.3;
    this.applyIntensity();
  }

  setIntensity(value: EffectIntensity): void {
    this.intensity = Math.max(0, Math.min(1, value));
    this.applyIntensity();
  }

  destroy(): void {
    this.filter.destroy();
  }

  private applyIntensity(): void {
    this.filter.strength = this.baseStrength * this.intensity;
  }
}

export class GlowEffect implements FilterEffect {
  readonly id: string;
  readonly name = "光晕效果";
  readonly type = "glow";
  readonly filter: ColorMatrixFilter;
  intensity: EffectIntensity;
  private readonly color: number;

  constructor(options: GlowOptions & { id: string }) {
    this.id = options.id;
    this.filter = new ColorMatrixFilter();
    this.intensity = options.intensity ?? 0.3;
    this.color = options.color ?? 0xffaa44;
    this.applyIntensity();
  }

  setIntensity(value: EffectIntensity): void {
    this.intensity = Math.max(0, Math.min(1, value));
    this.applyIntensity();
  }

  destroy(): void {
    this.filter.destroy();
  }

  private applyIntensity(): void {
    const r = ((this.color >> 16) & 0xff) / 255;
    const g = ((this.color >> 8) & 0xff) / 255;
    const b = (this.color & 0xff) / 255;

    const boost = this.intensity * 0.3; // brightness boost 0-30%
    const shift = this.intensity * 0.2; // color shift 0-20%

    // Matrix: increase brightness + shift toward target color
    const matrix: ColorMatrix = [
      1 + boost + shift * r, shift * g, shift * b, 0, shift * r * 0.3,
      shift * r, 1 + boost + shift * g, shift * b, 0, shift * g * 0.3,
      shift * r, shift * g, 1 + boost + shift * b, 0, shift * b * 0.3,
      0, 0, 0, 1, 0,
    ];

    this.filter.matrix = matrix;
  }
}

export class ColorGradingEffect implements FilterEffect {
  readonly id: string;
  readonly name = "色彩分级";
  readonly type = "color-grading";
  readonly filter: ColorMatrixFilter;
  intensity: EffectIntensity;
  private baseMatrix: ColorMatrix;

  constructor(options: ColorGradingOptions & { id: string }) {
    this.id = options.id;
    this.filter = new ColorMatrixFilter();
    this.intensity = options.intensity ?? 0.2;
    this.baseMatrix = this.createMatrixForTemperature(options.temperature);
    this.applyIntensity();
  }

  setIntensity(value: EffectIntensity): void {
    this.intensity = Math.max(0, Math.min(1, value));
    this.applyIntensity();
  }

  destroy(): void {
    this.filter.destroy();
  }

  private applyIntensity(): void {
    this.filter.matrix = lerpMatrix(this.baseMatrix, this.intensity);
  }

  private createMatrixForTemperature(temperature: ColorGradingOptions["temperature"]): ColorMatrix {
    switch (temperature) {
      case "warm":
        return [
          1.2, 0.05, 0, 0, 0,
          0.05, 1.1, 0, 0, 0,
          0, 0, 0.85, 0, 0,
          0, 0, 0, 1, 0,
        ];
      case "cool":
        return [
          0.85, 0, 0.05, 0, 0,
          0, 0.95, 0.05, 0, 0,
          0.05, 0.05, 1.2, 0, 0,
          0, 0, 0, 1, 0,
        ];
      case "neutral":
      default:
        return [
          1, 0, 0, 0, 0,
          0, 1, 0, 0, 0,
          0, 0, 1, 0, 0,
          0, 0, 0, 1, 0,
        ];
    }
  }
}
