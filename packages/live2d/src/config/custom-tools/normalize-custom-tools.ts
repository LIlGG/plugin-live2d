import {
  isRecord,
  pickNumber,
  pickString,
} from "@/live2d/config/normalize-helpers";
import { normalizeCustomToolAction } from "@/live2d/live2d/tools/custom-tool-actions/index";
import type { CustomToolConfig } from "@/live2d/live2d/tools/custom-tool-config";
import { isNotEmptyString } from "@/live2d/utils/isString";

export const normalizeCustomTools = (
  tools: unknown,
): CustomToolConfig[] | undefined => {
  if (!Array.isArray(tools)) {
    return;
  }

  return tools.flatMap((tool) => {
    if (!isRecord(tool) || !isNotEmptyString(tool.name)) {
      return [];
    }

    const action = normalizeCustomToolAction(tool.action);
    if (!action) {
      return [];
    }

    const normalizedTool: CustomToolConfig = {
      name: tool.name,
      action,
    };

    const icon = pickString(tool.icon);
    if (icon) {
      normalizedTool.icon = icon;
    }

    const priority = pickNumber(tool.priority);
    if (priority !== undefined) {
      normalizedTool.priority = priority;
    }

    return [normalizedTool];
  });
};
