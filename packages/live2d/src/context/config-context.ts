import { createContext } from '@lit/context';
import { CustomToolConfig } from 'live2d/tools/custom-tool';

export interface ObjectAny extends Record<string, unknown> { }

export interface TipMouseover extends ObjectAny {
  selector: string;
  text: string[] | string;
}

export interface TipClick extends ObjectAny {
  selector: string;
  text: string[] | string;
}

export interface TipSeason extends ObjectAny {
  date: string;
  text: string[] | string;
}

export interface TipTime extends ObjectAny {
  hour: string;
  text: string[] | string;
}

export interface TipMessage extends ObjectAny {
  default?: string[] | string;
  console?: string[] | string;
  copy?: string[] | string;
  visibilitychange?: string[] | string;
}

export interface TipConfig {
  mouseover: TipMouseover[];
  click: TipClick[];
  seasons: TipSeason[];
  time: TipTime[];
  message: TipMessage;
}

export interface Live2dToolsConfig {
  // 是否显示右侧工具栏
  isTools?: boolean;
  // 显示的预设工具
  tools?: string[];
  // 自定义工具
  customTools?: CustomToolConfig[];
  // openai 图标
  openaiIcon?: string;
  // 一言图标
  hitokotoIcon?: string;
  // 一言API
  hitokotoApi?: string;
  // 小宇宙游戏图标
  asteroidsIcon?: string;
  // 切换模型图标
  switchModelIcon?: string;
  // 切换纹理图标
  switchTextureIcon?: string;
  // 截图生成的图片名称
  screenshotName?: string;
  // 截图图标
  screenshotIcon?: string;
  // 信息图标
  infoIcon?: string;
  // 信息站点地址
  infoSite?: string;
  // 退出 Live2d 图标
  exitIcon?: string;
}

export interface Live2dConfig extends Live2dToolsConfig {
  // Live2d API 路径
  apiPath: string;
  // Live2d 定位
  live2dLocation: "left" | "right";
  // 是否在控制台显示状态
  consoleShowStatus?: boolean;
  // 是否强制使用默认配置
  isForceUseDefaultConfig?: boolean;
  // 模型编号
  modelId?: number;
  // 纹理编号
  modelTexturesId?: number;
  // 主题下的 tips 文件路径
  themeTipsPath?: string;
  // 用户自定义的 tips 文件路径
  tipsPath?: string;
  // 用户使用插件定义的 tips
  selectorTips?: [{
    messageTexts?: {
      message: string;
    }[];
    selector: string;
    mouseAction: "click" | "mouseover" | string | undefined;
  }];
  // 页面可见性变化时的 tips
  backSiteTip: string[] | string;
  // 复制内容时的 tips
  copyContentTip: string[] | string;
  // 控制台打印 tips
  openConsoleTip: string[] | string;
  // 首次打开站点是否显示 tips
  firstOpenSite?: boolean
  [key: string]: unknown;
}

export const configContext = createContext<Live2dConfig>("config");