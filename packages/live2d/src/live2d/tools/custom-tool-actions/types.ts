import type { Live2dConfig } from "@/live2d/context/config-context";
import type Model from "@/live2d/live2d/model";

export interface CustomToolExecutionContext {
  config: Live2dConfig;
  model?: Model | null;
  tool: {
    name: string;
    icon?: string;
    priority?: number;
  };
}

export type CustomToolActionInput = Record<string, unknown>;

export interface BaseCustomToolAction {
  type: string;
}

export type CustomToolActionHandler<
  T extends BaseCustomToolAction = BaseCustomToolAction,
> = (context: CustomToolExecutionContext, action: T) => void | Promise<void>;

export interface CustomToolActionDefinition<
  T extends BaseCustomToolAction = BaseCustomToolAction,
> {
  type: T["type"];
  normalize: (action: CustomToolActionInput) => T | undefined;
  execute: CustomToolActionHandler<T>;
}

export const defineCustomToolAction = <const T extends BaseCustomToolAction>(
  definition: CustomToolActionDefinition<T>,
): CustomToolActionDefinition<T> => definition;
