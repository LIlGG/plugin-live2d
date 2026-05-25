export type BlendMode = "override" | "add";

export type SemanticName = string;

export type ParameterId = string;

export interface SemanticMapping {
  candidates: ParameterId[];
}

export type ParameterAvailability = "detected" | "missing" | "not-applicable";

export interface CapabilityProfile {
  detected: Map<SemanticName, ParameterId>;
  missing: SemanticName[];
  notApplicable: SemanticName[];
}

export interface ResolvedParameter {
  id: ParameterId;
  index: number;
  min: number;
  max: number;
  defaultValue: number;
}

export interface ParameterAccessor {
  getValue(index: number): number;
  setValue(index: number, value: number): void;
  getMin(index: number): number;
  getMax(index: number): number;
  getDefault(index: number): number;
  getAllIds(): string[];
  findIndex(id: string): number;
}
