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

interface HeldOverride {
  value: number;
  source: string;
  priority: SystemPriority;
}

/**
 * Applies the queued parameter writes from inside the engine's own update.
 *
 * The engine saves the current parameter values as a baseline every frame
 * (`CubismModel.saveParameters` / `saveParam`) and restores that baseline at the
 * end of the same frame (`loadParameters` / `loadParam`). A write made after the
 * restore therefore becomes part of the next frame's baseline, which made an
 * `add` write - relative to the current value - stack on top of its own previous
 * result until the parameter reached its limit.
 *
 * Writing from the engine's `beforeModelUpdate` event instead - after the
 * baseline was saved and before the model is rendered with the parameters -
 * keeps a write visible for that frame only: an `add` is applied on top of the
 * engine's current value and is dropped when the engine restores its baseline,
 * so no bookkeeping of previous contributions is needed.
 *
 * Writes come in two flavours:
 *
 * - `queueWrite()` - a one-frame contribution. Every `add`, and every override
 *   a subsystem re-sends each frame (blink, motion layers), belongs here.
 * - `holdOverride()` - an override that must survive frames the writer does not
 *   know about: the DevTools slider or an FSM state profile sets its value once,
 *   so the coordinator re-applies it on every flush until `releaseOverride()`.
 */
export class ParameterCoordinator {
  private queue = new Map<string, QueuedWrite[]>();
  private held = new Map<string, HeldOverride>();
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
   * Drop pending writes and held overrides.
   *
   * Must be called when the model changes: pending writes were queued against
   * the previous model's parameters.
   */
  reset(): void {
    this.queue.clear();
    this.held.clear();
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
   * Hold `parameter` at `value` until it is replaced or released.
   *
   * A held value is re-applied on every flush. That is what keeps a write that
   * happens only once - the DevTools slider, an FSM state profile - taking
   * effect: the engine restores its own baseline at the end of every frame, so
   * a queued write is only visible in the frame it was queued in.
   *
   * A lower-priority hold never replaces a higher-priority one (MANUAL=1 is the
   * highest); that suppression is logged like any other conflict.
   */
  holdOverride(
    parameter: string,
    value: number,
    source: string,
    priority: SystemPriority,
  ): void {
    const existing = this.held.get(parameter);
    if (existing && existing.priority < priority) {
      this.logConflict(parameter, existing, { value, source });
      return;
    }
    this.held.set(parameter, { value, source, priority });
  }

  /**
   * Release a held override. With `source` given only that source's hold is
   * released, so one subsystem cannot drop another's.
   */
  releaseOverride(parameter: string, source?: string): void {
    const existing = this.held.get(parameter);
    if (!existing) return;
    if (source !== undefined && existing.source !== source) return;
    this.held.delete(parameter);
  }

  /** Value a held override currently pins `parameter` to, if any. */
  getHeldValue(parameter: string): number | undefined {
    return this.held.get(parameter)?.value;
  }

  /**
   * Resolve all queued writes, detect conflicts, and apply to the semantic
   * layer. Driven by the engine's `beforeModelUpdate` event, so the values are
   * part of that frame's render and are dropped by the engine afterwards.
   */
  flush(): void {
    for (const [parameter, writes] of this.queue) {
      this.resolveParameter(parameter, writes);
    }
    // A held override whose parameter nobody wrote this frame still has to be
    // re-applied: the engine restored its baseline at the end of the last frame.
    // The queue still holds this frame's parameters, so it doubles as the lookup.
    if (this.held.size > 0) {
      for (const [parameter, held] of this.held) {
        if (!this.queue.has(parameter)) {
          this.applyAbsolute(parameter, held.value);
        }
      }
    }
    this.queue.clear();
  }

  /**
   * Write an absolute value, temporarily detaching the coordinator so that the
   * write is not re-queued.
   */
  private applyAbsolute(parameter: string, value: number): void {
    this.semanticLayer.setCoordinator(undefined);
    try {
      this.semanticLayer.setSemantic(parameter, value, "override");
    } finally {
      this.semanticLayer.setCoordinator(this);
    }
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
    // Single pass: pick the highest-priority override and sum every add.
    // (filter/filter/reduce/reduce allocated four arrays per parameter per frame.)
    let winner: QueuedWrite | null = null;
    let addSum = 0;
    let hasAdd = false;

    for (const write of writes) {
      if (write.blendMode === "override") {
        // Lower priority number wins; on a tie keep the first one queued.
        if (winner === null || write.priority < winner.priority) {
          winner = write;
        }
      } else {
        addSum += write.value;
        hasAdd = true;
      }
    }

    const held = this.held.get(parameter);

    if (winner === null) {
      if (held === undefined) {
        // Only relative writes: stack them on the engine's current value. The
        // engine drops them when it restores its baseline, so they never
        // accumulate across frames.
        const current = this.semanticLayer.getSemantic(parameter) ?? 0;
        this.applyAbsolute(parameter, current + addSum);
        return;
      }

      // A hold with relative writes on top of it: no queued override left to
      // resolve a conflict against, and every queued write here is an add.
      this.applyAbsolute(parameter, held.value + addSum);
      return;
    }

    // Resolve override conflicts: lowest priority number wins (MANUAL=1 is highest)
    for (const write of writes) {
      if (write !== winner && write.blendMode === "override") {
        this.logConflict(parameter, winner, write);
      }
    }

    // A held override outranks a queued one unless the queued one has a
    // strictly higher priority; on a tie the held value - the established
    // state - wins. Queued writes suppressed by a hold are not logged: the hold
    // is re-applied every frame, so logging them would flood the conflict log.
    const effective =
      held !== undefined && held.priority <= winner.priority
        ? held.value
        : winner.value;

    // Adds don't conflict, they accumulate on top of the winning override.
    this.applyAbsolute(parameter, hasAdd ? effective + addSum : effective);
  }

  private logConflict(
    parameter: string,
    winner: { value: number; source: string },
    loser: { value: number; source: string },
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
