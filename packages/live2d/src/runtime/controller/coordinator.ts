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

interface HeldWrite {
  value: number;
  blendMode: BlendMode;
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
 * - `holdWrite()` - a contribution that must survive frames the writer does not
 *   know about: the DevTools slider or an FSM state profile sets its value once,
 *   so the coordinator re-applies it on every flush until `releaseOverride()`.
 */
export class ParameterCoordinator {
  private queue = new Map<string, QueuedWrite[]>();
  private held = new Map<string, Map<string, HeldWrite>>();
  private conflictLog: ConflictEntry[] = [];
  private activeHeldQueueConflicts = new Set<string>();
  private nextHeldQueueConflicts = new Set<string>();
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
    this.activeHeldQueueConflicts.clear();
    this.nextHeldQueueConflicts.clear();
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
   * Hold a source's contribution until it is replaced or released.
   *
   * A held value is re-applied on every flush. That is what keeps a write that
   * happens only once - the DevTools slider, an FSM state profile - taking
   * effect: the engine restores its own baseline at the end of every frame, so
   * a queued write is only visible in the frame it was queued in.
   *
   * Keep suppressed sources so they can take over when a higher-priority
   * source releases its hold. Additive holds contribute on every frame.
   */
  holdWrite(
    parameter: string,
    value: number,
    blendMode: BlendMode,
    source: string,
    priority: SystemPriority,
  ): void {
    const sources = this.held.get(parameter) ?? new Map<string, HeldWrite>();
    if (blendMode === "override" && !sources.has(source)) {
      let existingWinner: HeldWrite | undefined;
      for (const held of sources.values()) {
        if (
          held.blendMode === "override" &&
          (!existingWinner || held.priority < existingWinner.priority)
        ) {
          existingWinner = held;
        }
      }
      if (existingWinner) {
        const incoming = { value, source };
        if (priority < existingWinner.priority) {
          this.logConflict(parameter, incoming, existingWinner);
        } else {
          this.logConflict(parameter, existingWinner, incoming);
        }
      }
    }
    sources.set(source, { value, blendMode, source, priority });
    this.held.set(parameter, sources);
  }

  holdOverride(
    parameter: string,
    value: number,
    source: string,
    priority: SystemPriority,
  ): void {
    this.holdWrite(parameter, value, "override", source, priority);
  }

  /**
   * Release a held write. With `source` given only that source's hold is
   * released, so one subsystem cannot drop another's.
   */
  releaseOverride(parameter: string, source?: string): void {
    if (source === undefined) {
      this.held.delete(parameter);
      return;
    }
    const sources = this.held.get(parameter);
    sources?.delete(source);
    if (sources?.size === 0) this.held.delete(parameter);
  }

  hasHeldWrite(parameter: string, source: string): boolean {
    return this.held.get(parameter)?.has(source) ?? false;
  }

  getHeldValue(parameter: string, source: string): number | undefined {
    return this.held.get(parameter)?.get(source)?.value;
  }

  /**
   * Resolve all queued writes, detect conflicts, and apply to the semantic
   * layer. Driven by the engine's `beforeModelUpdate` event, so the values are
   * part of that frame's render and are dropped by the engine afterwards.
   */
  flush(): void {
    const heldQueueConflicts = this.nextHeldQueueConflicts;
    heldQueueConflicts.clear();
    for (const [parameter, writes] of this.queue) {
      this.resolveParameter(parameter, writes, heldQueueConflicts);
    }
    // A held contribution whose parameter nobody wrote this frame still has to be
    // re-applied: the engine restored its baseline at the end of the last frame.
    // The queue still holds this frame's parameters, so it doubles as the lookup.
    if (this.held.size > 0) {
      for (const parameter of this.held.keys()) {
        if (!this.queue.has(parameter)) {
          this.resolveParameter(parameter, [], heldQueueConflicts);
        }
      }
    }
    this.queue.clear();
    this.nextHeldQueueConflicts = this.activeHeldQueueConflicts;
    this.activeHeldQueueConflicts = heldQueueConflicts;
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
    this.activeHeldQueueConflicts.clear();
    this.nextHeldQueueConflicts.clear();
  }

  private resolveParameter(
    parameter: string,
    writes: QueuedWrite[],
    heldQueueConflicts: Set<string>,
  ): void {
    // Single pass: pick the highest-priority override and sum every add.
    // (filter/filter/reduce/reduce allocated four arrays per parameter per frame.)
    let queuedWinner: QueuedWrite | null = null;
    let winnerIsHeld = false;
    let addSum = 0;
    let hasAdd = false;

    for (const write of writes) {
      if (write.blendMode === "override") {
        // Lower priority number wins; on a tie keep the first one queued.
        if (queuedWinner === null || write.priority < queuedWinner.priority) {
          queuedWinner = write;
        }
      } else {
        addSum += write.value;
        hasAdd = true;
      }
    }

    // Preserve queued-vs-queued diagnostics even when a hold eventually wins.
    if (queuedWinner) {
      for (const write of writes) {
        if (write !== queuedWinner && write.blendMode === "override") {
          this.logConflict(parameter, queuedWinner, write);
        }
      }
    }

    let winner: QueuedWrite | HeldWrite | null = queuedWinner;
    const held = this.held.get(parameter);
    if (held) {
      for (const write of held.values()) {
        if (write.blendMode === "add") {
          addSum += write.value;
          hasAdd = true;
        } else if (
          winner === null ||
          write.priority < winner.priority ||
          (write.priority === winner.priority && !winnerIsHeld)
        ) {
          // On a tie an established hold takes precedence over a queued write.
          winner = write;
          winnerIsHeld = true;
        }
      }
    }

    // Held-vs-queued conflicts are useful diagnostics, but the same systems
    // may compete on every frame. Report each pairing once until it stops.
    if (winner && held) {
      if (winnerIsHeld) {
        for (const write of writes) {
          if (write.blendMode === "override" && write.source !== winner.source) {
            this.logHeldQueueConflict(
              parameter,
              winner,
              write,
              heldQueueConflicts,
            );
          }
        }
      } else {
        for (const write of held.values()) {
          if (write.blendMode === "override" && write.source !== winner.source) {
            this.logHeldQueueConflict(
              parameter,
              winner,
              write,
              heldQueueConflicts,
            );
          }
        }
      }
    }
    const current = this.semanticLayer.getSemantic(parameter) ?? 0;
    this.applyAbsolute(parameter, (winner?.value ?? current) + (hasAdd ? addSum : 0));
  }

  private logHeldQueueConflict(
    parameter: string,
    winner: { value: number; source: string },
    loser: { value: number; source: string },
    currentConflicts: Set<string>,
  ): void {
    const key = JSON.stringify([parameter, winner.source, loser.source]);
    currentConflicts.add(key);
    if (!this.activeHeldQueueConflicts.has(key)) {
      this.logConflict(parameter, winner, loser);
    }
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
