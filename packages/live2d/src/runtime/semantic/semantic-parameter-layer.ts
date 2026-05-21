import type {
  BlendMode,
  CapabilityProfile,
  ParameterAccessor,
  SemanticName,
  ParameterId,
} from "./types";
import { DEFAULT_SEMANTIC_MAPPINGS } from "./default-mappings";
import { createParameterAccessor } from "./parameter-accessor";
import type { ParameterCoordinator } from "../controller/coordinator";
import type { SystemPriority } from "../controller/types";

export class SemanticParameterLayer {
  private accessor: ParameterAccessor | null = null;
  private resolved = new Map<SemanticName, { id: ParameterId; index: number }>();
  private customMappings = new Map<SemanticName, ParameterId[]>();
  private capabilityProfile: CapabilityProfile = {
    detected: new Map(),
    missing: [],
    notApplicable: [],
  };
  private sourceModel: object | null = null;
  private coordinator?: ParameterCoordinator;

  /**
   * Register a custom semantic mapping before model detection.
   */
  registerSemantic(name: SemanticName, candidates: ParameterId[]): void {
    this.customMappings.set(name, candidates);
  }

  /**
   * Detect available semantic parameters from a loaded Live2D model.
   */
  detectFromModel(model: object): CapabilityProfile {
    this.sourceModel = model;

    const coreModel = this.extractCoreModel(model);
    if (!coreModel) {
      throw new Error("SemanticParameterLayer: unable to extract core model");
    }

    this.accessor = createParameterAccessor(coreModel);
    if (!this.accessor) {
      throw new Error(
        "SemanticParameterLayer: unsupported core model type",
      );
    }

    this.resolved.clear();
    const detected = new Map<SemanticName, ParameterId>();
    const missing: SemanticName[] = [];
    const notApplicable: SemanticName[] = [];

    // Merge default and custom mappings (custom takes precedence)
    const allMappings = new Map<string, ParameterId[]>();
    for (const [name, candidates] of Object.entries(DEFAULT_SEMANTIC_MAPPINGS)) {
      allMappings.set(name, candidates);
    }
    for (const [name, candidates] of this.customMappings) {
      allMappings.set(name, candidates);
    }

    for (const [semanticName, candidates] of allMappings) {
      const found = this.findParameter(candidates);
      if (found !== null) {
        this.resolved.set(semanticName, found);
        detected.set(semanticName, found.id);
      } else {
        missing.push(semanticName);
      }
    }

    this.capabilityProfile = { detected, missing, notApplicable };
    return this.capabilityProfile;
  }

  /**
   * Set an optional write coordinator. When set, setSemantic calls
   * are redirected to the coordinator's queue instead of being applied
   * immediately. The coordinator is responsible for conflict resolution
   * and flushing.
   */
  setCoordinator(coordinator: ParameterCoordinator | undefined): void {
    this.coordinator = coordinator;
  }

  /**
   * Check if a semantic parameter is available.
   */
  hasSemantic(name: SemanticName): boolean {
    return this.resolved.has(name);
  }

  /**
   * Get the current value of a semantic parameter.
   */
  getSemantic(name: SemanticName): number | undefined {
    const param = this.resolved.get(name);
    if (!param || !this.accessor) return undefined;
    return this.accessor.getValue(param.index);
  }

  /**
   * Set the value of a semantic parameter.
   * blendMode: 'override' replaces the value, 'add' adds to the current value.
   */
  setSemantic(
    name: SemanticName,
    value: number,
    blendMode: BlendMode = "override",
    source?: string,
    priority?: SystemPriority,
  ): void {
    const param = this.resolved.get(name);
    if (!param || !this.accessor) return;

    // If a coordinator is active, delegate to it for conflict resolution.
    if (this.coordinator) {
      this.coordinator.queueWrite(
        name,
        value,
        blendMode,
        source ?? "direct",
        priority ?? 5,
      );
      return;
    }

    let targetValue: number;
    if (blendMode === "add") {
      const current = this.accessor.getValue(param.index);
      targetValue = current + value;
    } else {
      targetValue = value;
    }

    // Clamp to parameter bounds
    const min = this.accessor.getMin(param.index);
    const max = this.accessor.getMax(param.index);
    targetValue = Math.max(min, Math.min(max, targetValue));

    this.accessor.setValue(param.index, targetValue);
  }

  /**
   * Get the capability profile from the last detection.
   */
  getCapabilityProfile(): CapabilityProfile {
    return this.capabilityProfile;
  }

  private extractCoreModel(model: object): object | null {
    // Live2DModel from untitled-pixi-live2d-engine has internalModel.coreModel
    const internalModel = (model as Record<string, unknown>)
      .internalModel as Record<string, unknown> | undefined;
    if (internalModel?.coreModel) {
      return internalModel.coreModel as object;
    }

    // Direct core model
    if (
      typeof (model as Record<string, unknown>).getParamFloat === "function" ||
      typeof (model as Record<string, unknown>).setParameterValueByIndex ===
        "function"
    ) {
      return model;
    }

    return null;
  }

  /**
   * Find a hit area index by name pattern match.
   * Returns the index of the first hit area whose name matches the pattern.
   */
  getHitAreaIndex(namePattern: RegExp): number | undefined {
    if (!this.sourceModel) return undefined;

    const internalModel = (this.sourceModel as Record<string, unknown>)
      .internalModel as Record<string, unknown> | undefined;
    if (!internalModel?.hitAreas) return undefined;

    const hitAreas = internalModel.hitAreas as Record<
      string,
      { name: string; index: number }
    >;
    const hitArea = Object.values(hitAreas).find(({ name }) =>
      namePattern.test(name),
    );
    return hitArea?.index;
  }

  /**
   * Get the bounding box of a drawable by its index.
   * Returns null if the model or drawable is not available.
   */
  getDrawableBounds(index: number): {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null {
    if (!this.sourceModel) return null;

    const internalModel = (this.sourceModel as Record<string, unknown>)
      .internalModel as Record<string, unknown> | undefined;
    if (typeof internalModel?.getDrawableBounds !== "function") return null;

    const bounds = (
      internalModel.getDrawableBounds as (index: number) => {
        x: number;
        y: number;
        width: number;
        height: number;
      }
    )(index);

    if (
      !Number.isFinite(bounds.x) ||
      !Number.isFinite(bounds.y) ||
      bounds.width <= 0 ||
      bounds.height <= 0
    ) {
      return null;
    }

    return bounds;
  }

  private findParameter(
    candidates: ParameterId[],
  ): { id: ParameterId; index: number } | null {
    if (!this.accessor) return null;

    for (const id of candidates) {
      const index = this.accessor.findIndex(id);
      if (index >= 0) {
        return { id, index };
      }
    }

    return null;
  }
}
