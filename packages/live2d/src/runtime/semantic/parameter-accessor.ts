import type { ParameterAccessor } from "./types";

function isCubism2CoreModel(model: object): model is {
  getParamFloat: (id: string | number) => number;
  setParamFloat: (id: string | number, value: number, weight?: number) => void;
  getParamIndex: (id: string) => number;
} {
  return (
    typeof (model as Record<string, unknown>).getParamFloat === "function" &&
    typeof (model as Record<string, unknown>).setParamFloat === "function"
  );
}

function isCubism4CoreModel(model: object): model is {
  _model: {
    parameters: {
      ids: string[];
      values: Float32Array;
      minimumValues: Float32Array;
      maximumValues: Float32Array;
      defaultValues: Float32Array;
    };
  };
  getParameterValueByIndex: (index: number) => number;
  setParameterValueByIndex: (
    index: number,
    value: number,
    weight?: number,
  ) => void;
} {
  return (
    typeof (model as Record<string, unknown>).setParameterValueByIndex ===
      "function" &&
    (model as Record<string, unknown>)._model !== undefined
  );
}

export function createParameterAccessor(
  coreModel: object,
): ParameterAccessor | null {
  if (isCubism2CoreModel(coreModel)) {
    // Some Cubism 2 implementations only accept string parameter IDs,
    // not numeric indices. Store the resolved ID so getValue/setValue
    // can use the string form safely.
    const indexToId = new Map<number, string>();

    return {
      getValue(index: number): number {
        const id = indexToId.get(index);
        return id !== undefined ? coreModel.getParamFloat(id) : 0;
      },
      setValue(index: number, value: number): void {
        const id = indexToId.get(index);
        if (id !== undefined) {
          coreModel.setParamFloat(id, value);
        }
      },
      getMin(_index: number): number {
        return -30;
      },
      getMax(_index: number): number {
        return 30;
      },
      getDefault(_index: number): number {
        return 0;
      },
      getAllIds(): string[] {
        return Array.from(indexToId.values());
      },
      findIndex(id: string): number {
        const index = coreModel.getParamIndex(id);
        if (index >= 0) {
          indexToId.set(index, id);
        }
        return index;
      },
    };
  }

  if (isCubism4CoreModel(coreModel)) {
    const params = coreModel._model.parameters;
    const ids = params.ids;
    const values = params.values;
    const mins = params.minimumValues;
    const maxs = params.maximumValues;
    const defaults = params.defaultValues;

    return {
      getValue(index: number): number {
        return values[index] ?? 0;
      },
      setValue(index: number, value: number): void {
        coreModel.setParameterValueByIndex(index, value);
      },
      getMin(index: number): number {
        return mins[index] ?? -30;
      },
      getMax(index: number): number {
        return maxs[index] ?? 30;
      },
      getDefault(index: number): number {
        return defaults[index] ?? 0;
      },
      getAllIds(): string[] {
        return [...ids];
      },
      findIndex(id: string): number {
        return ids.indexOf(id);
      },
    };
  }

  return null;
}
