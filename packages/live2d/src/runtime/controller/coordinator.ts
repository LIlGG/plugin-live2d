import type { SemanticParameterLayer } from "../semantic";
import type { BlendMode } from "../semantic/types";
import type { SystemPriority, ConflictEntry } from "./types";

interface QueuedWrite {
  parameter: string;
  value: number;
  blendMode: BlendMode;
  source: string;
  priority: SystemPriority;
}

export class ParameterCoordinator {
  private queue = new Map<string, QueuedWrite[]>();
  private conflictLog: ConflictEntry[] = [];
  private semanticLayer: SemanticParameterLayer;
  private maxLogSize: number;

  constructor(
    semanticLayer: SemanticParameterLayer,
    options: { maxLogSize?: number } = {},
  ) {
    this.semanticLayer = semanticLayer;
    this.maxLogSize = options.maxLogSize ?? 50;
  }

  /**
   * Queue a parameter write. Writes are not applied until flush() is called.
   */
  queueWrite(
    parameter: string,
    value: number,
    blendMode: BlendMode,
    source: string,
    priority: SystemPriority,
  ): void {
    const list = this.queue.get(parameter) ?? [];
    list.push({ parameter, value, blendMode, source, priority });
    this.queue.set(parameter, list);
  }

  /**
   * Resolve all queued writes, detect conflicts, and apply to semantic layer.
   * Should be called once per frame after all subsystems have queued writes.
   */
  flush(): void {
    for (const [parameter, writes] of this.queue) {
      this.resolveParameter(parameter, writes);
    }
    this.queue.clear();
  }

  /**
   * Get the current conflict log.
   */
  getConflictLog(): ConflictEntry[] {
    return [...this.conflictLog];
  }

  /**
   * Clear the conflict log.
   */
  clearConflictLog(): void {
    this.conflictLog = [];
  }

  private resolveParameter(parameter: string, writes: QueuedWrite[]): void {
    const overrides = writes.filter((w) => w.blendMode === "override");
    const adds = writes.filter((w) => w.blendMode === "add");

    // Resolve override conflicts: lowest priority number wins (MANUAL=1 is highest)
    let finalValue = 0;
    let hasOverride = false;
    let winner: QueuedWrite | null = null;

    if (overrides.length > 0) {
      winner = overrides.reduce((a, b) => (a.priority <= b.priority ? a : b));
      finalValue = winner.value;
      hasOverride = true;

      // Log conflicts from other override sources
      for (const w of overrides) {
        if (w !== winner) {
          this.logConflict(parameter, winner, w);
        }
      }
    }

    // Sum all add outputs (adds don't conflict, they accumulate)
    if (adds.length > 0) {
      const sum = adds.reduce((s, w) => s + w.value, 0);
      if (hasOverride) {
        finalValue += sum;
      } else {
        finalValue = sum;
      }
    }

    // Temporarily detach coordinator to prevent recursive queuing.
    // setSemantic would otherwise re-queue through the coordinator.
    this.semanticLayer.setCoordinator(undefined);
    try {
      this.semanticLayer.setSemantic(parameter, finalValue, hasOverride ? "override" : "add");
    } finally {
      this.semanticLayer.setCoordinator(this);
    }
  }

  private logConflict(
    parameter: string,
    winner: QueuedWrite,
    loser: QueuedWrite,
  ): void {
    this.conflictLog.push({
      timestamp: Date.now(),
      parameter,
      winningSystem: winner.source,
      losingSystem: loser.source,
      winningValue: winner.value,
      losingValue: loser.value,
    });

    // Trim log to max size
    if (this.conflictLog.length > this.maxLogSize) {
      this.conflictLog.shift();
    }
  }
}
