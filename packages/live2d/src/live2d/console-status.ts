export interface ConsoleStatusMetadata {
  author: string;
  pluginName: string;
  repo: string;
  updateTime: string;
  version: string;
}

export interface ConsoleLike {
  groupCollapsed?: (label?: string, ...args: unknown[]) => void;
  groupEnd?: () => void;
  log: (message?: unknown, ...optionalParams: unknown[]) => void;
}

export const LEGACY_CONSOLE_STATUS_METADATA: ConsoleStatusMetadata = {
  author: "LIlGG",
  pluginName: "Live2D 看板娘",
  repo: "https://github.com/LIlGG/plugin-live2d",
  updateTime: "2022.12.09",
  version: "1.0.1",
};

export const getConsoleStatusLines = (
  metadata: ConsoleStatusMetadata = LEGACY_CONSOLE_STATUS_METADATA,
): string[] => {
  return [
    `${metadata.pluginName} · v${metadata.version}`,
    `作者：${metadata.author}`,
    `更新：${metadata.updateTime}`,
    `仓库：${metadata.repo}`,
  ];
};

export const logConsoleStatus = (
  consoleLike: ConsoleLike = console,
  metadata: ConsoleStatusMetadata = LEGACY_CONSOLE_STATUS_METADATA,
): void => {
  const [title, ...lines] = getConsoleStatusLines(metadata);

  if (consoleLike.groupCollapsed) {
    consoleLike.groupCollapsed(title);
    for (const line of lines) {
      consoleLike.log(line);
    }
    consoleLike.groupEnd?.();
    return;
  }

  consoleLike.log(title);
  for (const line of lines) {
    consoleLike.log(line);
  }
};
