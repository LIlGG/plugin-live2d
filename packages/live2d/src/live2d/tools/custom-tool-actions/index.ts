import { isRecord } from "@/live2d/config/normalize-helpers";
import {
  CUSTOM_TOOL_ACTION_TYPES,
  type CustomToolAction,
  customToolActionDefinitions,
} from "@/live2d/live2d/tools/custom-tool-actions/actions.generated";
import type {
  CustomToolActionDefinition,
  CustomToolActionHandler,
  CustomToolExecutionContext,
} from "@/live2d/live2d/tools/custom-tool-actions/types";

export const isCustomToolActionType = (
  value: unknown,
): value is CustomToolAction["type"] =>
  CUSTOM_TOOL_ACTION_TYPES.includes(String(value) as CustomToolAction["type"]);

const isCustomToolActionDefinition = (
  value: unknown,
): value is CustomToolActionDefinition =>
  isRecord(value) &&
  isCustomToolActionType(value.type) &&
  typeof value.normalize === "function" &&
  typeof value.execute === "function";

const createCustomToolActionRegistry = (): Record<
  CustomToolAction["type"],
  CustomToolActionDefinition
> => {
  const registry: Partial<
    Record<CustomToolAction["type"], CustomToolActionDefinition>
  > = {};

  for (const actionDefinition of customToolActionDefinitions) {
    if (!isCustomToolActionDefinition(actionDefinition)) {
      throw new Error("Invalid custom tool action definition");
    }

    const actionType = actionDefinition.type as CustomToolAction["type"];

    if (registry[actionType]) {
      throw new Error(
        `Duplicate custom tool action definition for ${actionType}`,
      );
    }

    registry[actionType] = actionDefinition;
  }

  for (const actionType of CUSTOM_TOOL_ACTION_TYPES) {
    if (!registry[actionType]) {
      throw new Error(
        `Missing custom tool action registration for ${actionType}`,
      );
    }
  }

  return registry as Record<
    CustomToolAction["type"],
    CustomToolActionDefinition
  >;
};

const customToolActionRegistry = createCustomToolActionRegistry();

export type { CustomToolExecutionContext } from "./types";

const getCustomToolActionDefinition = <T extends CustomToolAction["type"]>(
  type: T,
): CustomToolActionDefinition<Extract<CustomToolAction, { type: T }>> =>
  customToolActionRegistry[type] as unknown as CustomToolActionDefinition<
    Extract<CustomToolAction, { type: T }>
  >;

const executeTypedCustomToolAction = <T extends CustomToolAction>(
  definition: CustomToolActionDefinition<T>,
  context: CustomToolExecutionContext,
  action: T,
): ReturnType<CustomToolActionHandler<T>> =>
  definition.execute(context, action);

export const normalizeCustomToolAction = (
  action: unknown,
): CustomToolAction | undefined => {
  if (!isRecord(action) || !isCustomToolActionType(action.type)) {
    return;
  }

  return getCustomToolActionDefinition(action.type).normalize(action);
};

export const executeCustomToolAction = (
  context: CustomToolExecutionContext,
  action: CustomToolAction,
): void | Promise<void> =>
  executeTypedCustomToolAction(
    getCustomToolActionDefinition(action.type),
    context,
    action,
  );
