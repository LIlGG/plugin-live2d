import type {
  BehaviorState,
  BehaviorProfile,
  BehaviorContext,
  StateName,
  BehaviorFSMConfig,
} from "./types";
import type { LayerName } from "../motion/types";
import type { EffectPreset } from "../filters/types";

export class BehaviorFSM {
  private states = new Map<StateName, BehaviorState>();
  private currentState: StateName | null = null;
  private context: BehaviorContext;
  private config: Required<BehaviorFSMConfig>;
  private lastTransitionTime = 0; // 0 means no explicit transition has occurred yet

  // Track applied effects so they can be reversed on exit
  private activeFilterHandles = new Map<EffectPreset, string>();
  private activeMotionLayers = new Set<LayerName>();
  private proceduralModuleStates = new Map<string, boolean>();

  constructor(context: BehaviorContext, config: BehaviorFSMConfig = {}) {
    this.context = context;
    this.config = {
      enabled: config.enabled ?? true,
      initialState: config.initialState ?? "idle",
      defaultDebounceMs: config.defaultDebounceMs ?? 100,
    };
  }

  /**
   * Register a behavior state.
   */
  registerState(state: BehaviorState): void {
    this.states.set(state.name, state);
  }

  /**
   * Unregister a behavior state.
   */
  unregisterState(name: StateName): void {
    this.states.delete(name);
  }

  /**
   * Get the name of the current state, or null if not initialized.
   */
  getCurrentState(): StateName | null {
    return this.currentState;
  }

  /**
   * Check if a transition to the target state is possible.
   */
  canTransitionTo(target: StateName): boolean {
    if (!this.config.enabled) return false;
    if (target === this.currentState) return false;

    const targetState = this.states.get(target);
    if (!targetState) return false;

    if (this.currentState) {
      const currentState = this.states.get(this.currentState);
      const guard =
        targetState.transitionGuard ?? currentState?.transitionGuard;
      if (guard && !guard(this.currentState, target)) {
        return false;
      }
    }

    // Apply debounce only after at least one explicit transition has occurred
    if (this.lastTransitionTime > 0) {
      const currentState = this.currentState
        ? this.states.get(this.currentState)
        : undefined;
      const exitDebounce = currentState?.debounceMs;
      const entryDebounce = targetState.debounceMs;

      // If either state explicitly configures a debounce, use the max of those.
      // Otherwise fall back to the global default.
      let debounceMs: number;
      if (exitDebounce !== undefined || entryDebounce !== undefined) {
        debounceMs = Math.max(exitDebounce ?? 0, entryDebounce ?? 0);
      } else {
        debounceMs = this.config.defaultDebounceMs;
      }

      if (Date.now() - this.lastTransitionTime < debounceMs) {
        return false;
      }
    }

    return true;
  }

  /**
   * Transition to a target state.
   * Returns true if the transition succeeded, false otherwise.
   */
  transitionTo(target: StateName): boolean {
    if (!this.canTransitionTo(target)) {
      return false;
    }

    const fromStateName = this.currentState;
    const fromState = fromStateName
      ? this.states.get(fromStateName)
      : undefined;
    const toState = this.states.get(target);

    if (!toState) return false;

    // 1. Call exit hook on current state
    if (fromState?.onExit) {
      fromState.onExit(this.context);
    }

    // 2. Revert effects from current state
    if (fromState?.exitProfile) {
      this.revertProfile(fromState.exitProfile);
    } else if (fromState?.entryProfile) {
      this.revertProfile(fromState.entryProfile);
    }

    // 3. Call enter hook on new state
    if (toState.onEnter) {
      toState.onEnter(this.context);
    }

    // 4. Apply entry profile of new state
    if (toState.entryProfile) {
      this.applyProfile(toState.entryProfile);
    }

    this.currentState = target;
    // Only record transition time for transitions between actual states
    if (fromStateName !== null) {
      this.lastTransitionTime = Date.now();
    }

    return true;
  }

  /**
   * Initialize the FSM by entering the initial state.
   * This bypasses transition guards and debounce.
   */
  initialize(): void {
    const initial = this.config.initialState;
    if (!initial || !this.states.has(initial)) {
      return;
    }

    const state = this.states.get(initial)!;
    if (state.onEnter) {
      state.onEnter(this.context);
    }
    if (state.entryProfile) {
      this.applyProfile(state.entryProfile);
    }
    this.currentState = initial;
    // Note: we don't set lastTransitionTime here so the first explicit
    // transition after initialization is not debounced.
  }

  /**
   * Get all registered state names.
   */
  getRegisteredStates(): StateName[] {
    return Array.from(this.states.keys());
  }

  /**
   * Check if a state is registered.
   */
  hasState(name: StateName): boolean {
    return this.states.has(name);
  }

  private applyProfile(profile: BehaviorProfile): void {
    const {
      motionLayerSystem,
      filterPipeline,
      semanticLayer,
      proceduralSystem,
    } = this.context;

    if (profile.motionLayers && motionLayerSystem) {
      for (const layer of Object.keys(profile.motionLayers) as LayerName[]) {
        const effect = profile.motionLayers[layer];
        if (effect) {
          motionLayerSystem.play({
            layer,
            parameters: effect.parameters,
            fadeIn: effect.fadeIn,
          });
          this.activeMotionLayers.add(layer);
        }
      }
    }

    if (profile.filters && filterPipeline) {
      for (const preset of profile.filters) {
        const handle = filterPipeline.applyPreset(preset);
        this.activeFilterHandles.set(preset, handle.id);
      }
    }

    if (profile.semanticParameters && semanticLayer) {
      for (const [name, config] of Object.entries(profile.semanticParameters)) {
        if (semanticLayer.hasSemantic(name)) {
          semanticLayer.setSemantic(
            name,
            config.value,
            config.blendMode ?? "override",
            "fsm",
            2,
          );
        }
      }
    }

    if (profile.proceduralOverrides && proceduralSystem) {
      for (const [moduleName, enabled] of Object.entries(
        profile.proceduralOverrides,
      )) {
        // Store the original enabled state on first override so we can restore it
        if (!this.proceduralModuleStates.has(moduleName)) {
          const moduleStatus = proceduralSystem
            .getModuleStatuses()
            .find((m) => m.name === moduleName);
          this.proceduralModuleStates.set(
            moduleName,
            moduleStatus?.enabled ?? true,
          );
        }
        if (enabled) {
          proceduralSystem.enableModule(moduleName);
        } else {
          proceduralSystem.disableModule(moduleName);
        }
      }
    }
  }

  private revertProfile(profile: BehaviorProfile): void {
    const {
      motionLayerSystem,
      filterPipeline,
      semanticLayer,
      proceduralSystem,
    } = this.context;

    if (profile.motionLayers && motionLayerSystem) {
      for (const layer of Object.keys(profile.motionLayers) as LayerName[]) {
        motionLayerSystem.stop(layer);
        this.activeMotionLayers.delete(layer);
      }
    }

    if (profile.filters && filterPipeline) {
      for (const preset of profile.filters) {
        const handleId = this.activeFilterHandles.get(preset);
        if (handleId) {
          filterPipeline.remove(handleId);
          this.activeFilterHandles.delete(preset);
        }
      }
    }

    if (profile.semanticParameters && semanticLayer) {
      for (const name of Object.keys(profile.semanticParameters)) {
        semanticLayer.setSemantic(name, 0, "override", "fsm", 2);
      }
    }

    if (profile.proceduralOverrides && proceduralSystem) {
      for (const moduleName of Object.keys(profile.proceduralOverrides)) {
        const previousState = this.proceduralModuleStates.get(moduleName);
        if (previousState !== undefined) {
          if (previousState) {
            proceduralSystem.enableModule(moduleName);
          } else {
            proceduralSystem.disableModule(moduleName);
          }
          // Clean up tracking entry after restoring
          this.proceduralModuleStates.delete(moduleName);
        }
      }
    }
  }
}
