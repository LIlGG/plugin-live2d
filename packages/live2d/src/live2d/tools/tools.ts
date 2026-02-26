import type { Live2dConfig } from "@/live2d/context/config-context";
import type Model from "@/live2d/live2d/model";

export abstract class Tool {
  private _config: Live2dConfig;
  protected model?: Model | null;

  /**
   * 优先级, 数字越大越靠前
   */
  abstract priority: number;

  constructor(config: Live2dConfig, model?: Model | null) {
    this._config = config;
    this.model = model;
  }

  name(): string {
    return this.constructor.name;
  }

  abstract icon(): string;

  abstract execute(): void;

  protected getConfig(): Live2dConfig {
    return this._config;
  }

  setModel(model: Model | null): void {
    this.model = model;
  }

  protected getModel(): Model | null | undefined {
    return this.model;
  }
}
