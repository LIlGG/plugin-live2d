import type { Live2dConfig } from "../../context/config-context";
import { AIChatTool } from "./ai-chat";
import { AsteroidsTool } from "./asteroids";
import { ExitTool } from "./exit";
import { HitokotoTool } from "./hitokoto";
import { InfoTool } from "./info";
import { ScreenshotTool } from "./screenshot";
import { SwitchModelTool } from "./switch-model";
import { SwitchTextureTool } from "./switch-texture";
import type { Tool } from "./tools";

export type ToolConstructor = new (config: Live2dConfig) => Tool;

export const presetTools: ToolConstructor[] = [
  AsteroidsTool,
  AIChatTool,
  HitokotoTool,
  ExitTool,
  InfoTool,
  ScreenshotTool,
  SwitchModelTool,
  SwitchTextureTool,
];

export default presetTools;
