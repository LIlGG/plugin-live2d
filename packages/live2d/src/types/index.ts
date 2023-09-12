export interface Live2dPluginConfig {
  apiPath?: string;
  tools?: string[];
  updateTime?: number;
  version?: string;
  tipsPath: string;
  modelId?: number;
  modelTexturesId?: number;
  themeTipsPath: string;
  selectorTips?: SelectorTip[];
  backSiteTip?: string | string[];
  copyContentTip?: string | string[];
  openConsoleTip?: string | string[];
  firstOpenSite?: boolean;
  openConsole?: boolean;
  copyContent?: boolean;
  backSite?: boolean;
  modelSize?: number;
  isTools?: boolean;
  isOpenai?: boolean;
  photoName?: string;
  hitokotoApi?: string;
  chunkTimeout?: number;
  showChatMessageTimeout?: number;
  maxHistoryMessage: number;
}

export interface SelectorTip {
  selector: string;
  messageTexts: MessageText[];
  mouseAction: "hover" | "click"
}

export interface MessageText {
  message: string;
}

export interface Tip {
  mouseover: Selector[];
  click: Selector[];
  seasons?: Season[];
  time?: Time[];
  message?: Message;
}

export interface Selector {
  selector: string;
  text: string | string[];
}

export interface Season {
  date: string;
  text: string | string[];
}

export interface Time {
  hour: string;
  text: string | string[];
}

export interface Message {
  [key: string]: string | string[] | undefined
}