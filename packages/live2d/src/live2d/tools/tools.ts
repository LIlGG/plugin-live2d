import type { Live2dConfig } from "@/live2d/context/config-context";
import type Model from "@/live2d/live2d/model";

export abstract class Tool {
  private _config: Live2dConfig;
  protected model?: Model | null;
  private _isExecuting = false;
  private _cooldownUntil = 0;

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

  abstract execute(): void | Promise<void>;

  async triggerExecute(): Promise<void> {
    const now = Date.now();
    if (this._isExecuting || now < this._cooldownUntil) {
      return;
    }

    this._isExecuting = true;
    try {
      await this.execute();
    } finally {
      this._isExecuting = false;
      const cooldownMs = this.cooldownMs();
      if (cooldownMs > 0) {
        this._cooldownUntil = Date.now() + cooldownMs;
      }
    }
  }

  protected getConfig(): Live2dConfig {
    return this._config;
  }

  setModel(model: Model | null): void {
    this.model = model;
  }

  protected getModel(): Model | null | undefined {
    return this.model;
  }

  protected cooldownMs(): number {
    return 0;
  }
}
