import type { BlendMode, SemanticName } from "../semantic/types";
import type { ParameterSet as IParameterSet } from "./types";

export class MutableParameterSet implements IParameterSet {
  private entries = new Map<
    SemanticName,
    { value: number; blendMode: BlendMode }
  >();

  set(semantic: SemanticName, value: number, blendMode: BlendMode): void {
    const existing = this.entries.get(semantic);
    if (existing) {
      if (existing.blendMode === "add" && blendMode === "add") {
        // Sum multiple add operations
        this.entries.set(semantic, {
          value: existing.value + value,
          blendMode: "add",
        });
        return;
      }
      if (blendMode === "override") {
        // Override wins over existing
        this.entries.set(semantic, { value, blendMode: "override" });
        return;
      }
      // Existing is override, new is add → keep override
      return;
    }
    this.entries.set(semantic, { value, blendMode });
  }

  get(semantic: SemanticName): { value: number; blendMode: BlendMode } | undefined {
    return this.entries.get(semantic);
  }

  has(semantic: SemanticName): boolean {
    return this.entries.has(semantic);
  }

  forEach(
    callback: (semantic: SemanticName, value: number, blendMode: BlendMode) => void,
  ): void {
    for (const [semantic, { value, blendMode }] of this.entries) {
      callback(semantic, value, blendMode);
    }
  }

  clear(): void {
    this.entries.clear();
  }
}
