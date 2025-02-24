import type { Live2dConfig } from "../../context/config-context";

export abstract class Tool {
  private _config: Live2dConfig;
  /**
   * 优先级, 数字越大越靠前
   */
  abstract priority: number;

  constructor(config: Live2dConfig) {
    this._config = config;
  }

  name(): string {
    return this.constructor.name;
  }

  abstract icon(): string;

  abstract execute(): void;

  protected getConfig(): Live2dConfig {
    return this._config;
  }
}
