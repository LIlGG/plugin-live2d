import type { Live2dConfig } from "../../context/config-context";

export abstract class Tool {
  private _config: Live2dConfig;

  constructor(config: Live2dConfig) {
    this._config = config;
  }

  abstract name(): string;

  abstract icon(): string;

  abstract execute(): void;

  protected getConfig(): Live2dConfig {
    return this._config;
  }
}