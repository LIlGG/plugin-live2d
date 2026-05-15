export {
  CUSTOM_TOOL_ACTION_TYPES,
  type CustomToolAction,
  type CustomToolActionType,
} from "@/live2d/live2d/tools/custom-tool-actions/actions.generated";

import type { CustomToolAction } from "@/live2d/live2d/tools/custom-tool-actions/actions.generated";

export interface CustomToolConfig {
  name: string;
  icon?: string;
  priority?: number;
  action: CustomToolAction;
}
