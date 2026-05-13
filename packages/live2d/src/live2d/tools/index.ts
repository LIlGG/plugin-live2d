import { DEFAULT_TOOL_NAMES } from "@/live2d/config/default-config";
import type { Live2dConfig } from "@/live2d/context/config-context";
import type Model from "@/live2d/live2d/model";
import type { Tool } from "@/live2d/live2d/tools/tools";
import { AIChatTool } from "./ai-chat";
import { AsteroidsTool } from "./asteroids";
import { ExitTool } from "./exit";
import { HitokotoTool } from "./hitokoto";
import { InfoTool } from "./info";
import { ScreenshotTool } from "./screenshot";
import { SwitchModelTool } from "./switch-model";
import { SwitchTextureTool } from "./switch-texture";

export type ToolConstructor = new (
  config: Live2dConfig,
  model?: Model | null,
) => Tool;

export const toolRegistry: Record<string, ToolConstructor> = {
  asteroids: AsteroidsTool,
  chat: AIChatTool,
  openai: AIChatTool,
  hitokoto: HitokotoTool,
  quit: ExitTool,
  info: InfoTool,
  photo: ScreenshotTool,
  screenshot: ScreenshotTool,
  "switch-model": SwitchModelTool,
  "switch-texture": SwitchTextureTool,
};

export const defaultToolNames = [...DEFAULT_TOOL_NAMES];

export const presetTools = Array.from(new Set(Object.values(toolRegistry)));

export default presetTools;
