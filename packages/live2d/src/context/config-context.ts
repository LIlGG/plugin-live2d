import { createContext } from '@lit/context';

export interface Live2dConfig {
  // Live2d API 路径
  apiPath: string;
  // Live2d 定位
  live2dLocation: "left" | "right";
  // 是否在控制台显示状态
  consoleShowStatus?: boolean;
  // 是否显示右侧工具栏
  isTools?: boolean;
  [key: string]: unknown;
}

export const configContext = createContext<Live2dConfig>("config");