import { UnoLitElement } from "@/live2d/common/UnoLitElement";
import { html, type TemplateResult, unsafeCSS } from "lit";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import { state } from "lit/decorators.js";
import type { Live2dRuntimeController } from "@/live2d/runtime/controller";
import type { ControllerState, ConflictEntry } from "@/live2d/runtime/controller/types";
import type { EffectPreset } from "@/live2d/runtime/filters/types";

interface Section {
  id: string;
  title: string;
  icon: string;
  expanded: boolean;
}

const FSM_STATE_LABELS: Record<string, string> = {
  idle: "空闲",
  happy: "开心",
  thinking: "思考",
  talking: "说话",
  embarrassed: "害羞",
  angry: "生气",
  sleepy: "困倦",
  sad: "难过",
};

const EMOTION_LABELS: Record<string, string> = {
  neutral: "平静",
  happy: "开心",
  sad: "难过",
  angry: "生气",
  embarrassed: "害羞",
  surprised: "惊讶",
  sleepy: "困倦",
  thinking: "思考",
};

const FILTER_LABELS: Record<string, string> = {
  "evening-warm": "暖色黄昏",
  "morning-cool": "清凉晨光",
  neutral: "中性",
  "happy-glow": "快乐光晕",
  "shy-blush": "害羞红晕",
  "angry-red": "愤怒赤红",
};

export class Live2dDevTools extends UnoLitElement {
  @state()
  private _visible = false;

  @state()
  private _state: ControllerState = {
    fsmState: null,
    emotion: null,
    isTransitioning: false,
    transitionProgress: 0,
    activeFilters: [],
    motionLayers: [],
    proceduralModules: [],
  };

  @state()
  private _conflicts: ConflictEntry[] = [];

  @state()
  private _sections: Section[] = [
    { id: "perf", title: "性能监控", icon: "📈", expanded: true },
    { id: "fsm", title: "行为状态机", icon: "🎭", expanded: false },
    { id: "emotion", title: "情感时间线", icon: "💫", expanded: false },
    { id: "motion", title: "动作层级", icon: "🎬", expanded: false },
    { id: "filter", title: "滤镜效果", icon: "🎨", expanded: false },
    { id: "params", title: "语义参数", icon: "📊", expanded: false },
    { id: "procedural", title: "程序化动画", icon: "✨", expanded: false },
    { id: "conflicts", title: "冲突日志", icon: "⚡", expanded: false },
  ];

  // ── Performance metrics ──
  private _perfSamples: Array<{ fps: number; frameTime: number; timestamp: number }> = [];
  private readonly _MAX_PERF_SAMPLES = 120;
  private _lastRafTime = 0;
  private _rafId = 0;
  private _modelStats = {
    parameterCount: 0,
    drawableCount: 0,
    partCount: 0,
    textureCount: 0,
  };

  private _controller?: Live2dRuntimeController;
  private _updateInterval?: ReturnType<typeof setInterval>;
  private _dragging = false;
  private _dragOffset = { x: 0, y: 0 };
  private _panelX = 16;
  private _panelY = 16;

  setController(controller: Live2dRuntimeController): void {
    this._controller = controller;
  }

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("keydown", this._handleKeyDown);
    const saved = localStorage.getItem("live2d-devtools-position");
    if (saved) {
      try {
        const pos = JSON.parse(saved);
        this._panelX = pos.x ?? 16;
        this._panelY = pos.y ?? 16;
      } catch { /* ignore */ }
    }
    this._updateInterval = setInterval(() => this._pollState(), 80);
    this._rafId = requestAnimationFrame(this._collectPerf);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener("keydown", this._handleKeyDown);
    if (this._updateInterval) clearInterval(this._updateInterval);
    if (this._rafId) cancelAnimationFrame(this._rafId);
  }

  private _handleKeyDown = (e: KeyboardEvent): void => {
    if (e.ctrlKey && e.shiftKey && e.key === "D") {
      e.preventDefault();
      this._toggleVisible();
    }
  };

  private _toggleVisible(): void {
    this._visible = !this._visible;
  }

  private _pollState(): void {
    if (!this._controller) return;
    this._state = this._controller.getState();
    this._conflicts = this._controller.getConflictLog();
    this._updateModelStats();
  }

  private _collectPerf = (timestamp: number): void => {
    if (this._lastRafTime > 0) {
      const frameTime = timestamp - this._lastRafTime;
      const fps = frameTime > 0 ? 1000 / frameTime : 60;
      this._perfSamples.push({ fps: Math.min(fps, 120), frameTime, timestamp });
      if (this._perfSamples.length > this._MAX_PERF_SAMPLES) {
        this._perfSamples.shift();
      }
      // Request re-render for live chart when perf section is expanded
      const perfExpanded = this._sections.find((s) => s.id === "perf")?.expanded;
      if (perfExpanded && this._visible) {
        this.requestUpdate();
      }
    }
    this._lastRafTime = timestamp;
    this._rafId = requestAnimationFrame(this._collectPerf);
  };

  private _updateModelStats(): void {
    const semanticLayer = this._controller?.getSemanticLayer();
    if (!semanticLayer) return;

    // Parameter count from detected semantic profile
    const profile = semanticLayer.getCapabilityProfile();
    const paramCount = profile.detected.size;

    // Try to get detailed model stats from internal model
    let drawableCount = 0;
    let partCount = 0;
    let textureCount = 0;

    try {
      type ModelWithInternal = {
        internalModel?: {
          coreModel?: {
            getDrawableCount?(): number;
            getPartCount?(): number;
            _drawableCount?: number;
            drawableCount?: number;
            _partCount?: number;
            partCount?: number;
          };
          parts?: unknown[];
          drawables?: unknown[];
          drawDataList?: unknown[];
          textures?: unknown[];
        };
      };

      const model = (semanticLayer as unknown as Record<string, unknown>)["sourceModel"] as
        | ModelWithInternal
        | undefined;
      if (model) {
        const internal = model.internalModel;
        if (internal) {
          // Try various property names used by different Cubism versions
          const core = internal.coreModel;
          if (core) {
            // Cubism 4/5 style
            drawableCount =
              (typeof core.getDrawableCount === "function" ? core.getDrawableCount() : undefined) ??
              core._drawableCount ??
              core.drawableCount ??
              0;
            partCount =
              (typeof core.getPartCount === "function" ? core.getPartCount() : undefined) ??
              core._partCount ??
              core.partCount ??
              0;
          } else {
            // Cubism 2.1 style: internalModel itself may have the data
            if (Array.isArray(internal.parts)) {
              partCount = internal.parts.length;
            }
            const drawables = internal.drawables ?? internal.drawDataList;
            if (Array.isArray(drawables)) {
              drawableCount = drawables.length;
            }
          }
          textureCount = Array.isArray(internal.textures) ? internal.textures.length : 0;
        }
      }
    } catch {
      // Silently ignore reflection errors
    }

    this._modelStats = {
      parameterCount: paramCount,
      drawableCount,
      partCount,
      textureCount,
    };
  }

  private _toggleSection(id: string): void {
    this._sections = this._sections.map((s) =>
      s.id === id ? { ...s, expanded: !s.expanded } : s,
    );
  }

  private _startDrag(e: MouseEvent): void {
    this._dragging = true;
    const rect = this.shadowRoot?.querySelector(".l2d-panel")?.getBoundingClientRect();
    if (rect) {
      this._dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    document.addEventListener("mousemove", this._onDrag);
    document.addEventListener("mouseup", this._stopDrag);
  }

  private _onDrag = (e: MouseEvent): void => {
    if (!this._dragging) return;
    this._panelX = e.clientX - this._dragOffset.x;
    this._panelY = e.clientY - this._dragOffset.y;
    this.requestUpdate();
  };

  private _stopDrag = (): void => {
    this._dragging = false;
    document.removeEventListener("mousemove", this._onDrag);
    document.removeEventListener("mouseup", this._stopDrag);
    localStorage.setItem("live2d-devtools-position", JSON.stringify({ x: this._panelX, y: this._panelY }));
  };

  private _transitionFSM(state: string): void {
    this._controller?.transitionTo({ fsm: state });
  }

  private _transitionEmotion(emotion: string): void {
    this._controller?.transitionTo({ emotion });
  }

  private _applyFilter(preset: EffectPreset): void {
    this._controller?.getFilterPipeline().applyPreset(preset);
  }

  private _clearFilters(): void {
    this._controller?.getFilterPipeline().clear();
  }

  private _setFilterIntensity(id: string, value: number): void {
    this._controller?.getFilterPipeline().setIntensity(id, value);
  }

  private _setParamValue(param: string, value: number): void {
    this._controller?.getSemanticLayer().setSemantic(param, value, "override", "manual", 1);
  }

  render(): TemplateResult {
    if (!this._visible) {
      return html`
        <div class="l2d-indicator" @click=${() => this._toggleVisible()} title="Live2D 调试面板 (Ctrl+Shift+D)">
          <div class="l2d-indicator-icon">🎛️</div>
          <div class="l2d-indicator-pulse"></div>
        </div>
      `;
    }

    return html`
      <div class="l2d-panel" style="left: ${this._panelX}px; top: ${this._panelY}px;">
        <div class="l2d-header" @mousedown=${this._startDrag}>
          <div class="l2d-header-left">
            <span class="l2d-header-icon">🎛️</span>
            <span class="l2d-header-title">Live2D 实时调试台</span>
            <span class="l2d-header-badge">DEV</span>
          </div>
          <button class="l2d-header-close" @click=${() => this._toggleVisible()} title="关闭">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </div>

        <div class="l2d-body">
          ${this._renderPerfSection()}
          ${this._renderStatusBar()}
          ${this._renderFSMSection()}
          ${this._renderEmotionSection()}
          ${this._renderMotionSection()}
          ${this._renderFilterSection()}
          ${this._renderParamSection()}
          ${this._renderProceduralSection()}
          ${this._renderConflictSection()}
        </div>
      </div>
    `;
  }

  private _renderPerfSection(): TemplateResult {
    const section = this._sections.find((s) => s.id === "perf");
    if (!section) return html``;

    const samples = this._perfSamples;
    const recent = samples.slice(-60);
    const avgFps = recent.length > 0
      ? recent.reduce((s, d) => s + d.fps, 0) / recent.length
      : 0;
    const avgFrameTime = recent.length > 0
      ? recent.reduce((s, d) => s + d.frameTime, 0) / recent.length
      : 0;
    const maxFps = recent.length > 0 ? Math.max(...recent.map((d) => d.fps)) : 60;
    const fpsMin = 0;
    const fpsMax = Math.max(66, maxFps * 1.1);
    const w = 320;
    const h = 80;
    const pad = 4;

    // Build SVG area path for FPS (filled area under the line)
    const fpsLineParts: string[] = [];
    const fpsAreaParts: string[] = [];
    const step = recent.length > 1 ? (w - pad * 2) / (recent.length - 1) : 0;
    for (let i = 0; i < recent.length; i++) {
      const x = pad + i * step;
      const y = pad + (1 - (recent[i].fps - fpsMin) / (fpsMax - fpsMin)) * (h - pad * 2);
      const cmd = i === 0 ? "M" : "L";
      const point = `${cmd}${x.toFixed(1)},${y.toFixed(1)}`;
      fpsLineParts.push(point);
      fpsAreaParts.push(point);
    }
    // Close the area path down to bottom
    if (recent.length > 0) {
      const lastX = pad + (recent.length - 1) * step;
      fpsAreaParts.push(`L${lastX.toFixed(1)},${h - pad}L${pad},${h - pad}Z`);
    }
    const fpsLinePath = fpsLineParts.join("");
    const fpsAreaPath = fpsAreaParts.join("");

    // Build SVG area path for frame time
    const ftMax = Math.max(33, ...recent.map((d) => d.frameTime));
    const ftAreaParts: string[] = [];
    for (let i = 0; i < recent.length; i++) {
      const x = pad + i * step;
      const y = pad + (1 - recent[i].frameTime / ftMax) * (h - pad * 2);
      const cmd = i === 0 ? "M" : "L";
      ftAreaParts.push(`${cmd}${x.toFixed(1)},${y.toFixed(1)}`);
    }
    if (recent.length > 0) {
      const lastX = pad + (recent.length - 1) * step;
      ftAreaParts.push(`L${lastX.toFixed(1)},${h - pad}L${pad},${h - pad}Z`);
    }
    const ftAreaPath = ftAreaParts.join("");

    // Build SVG content as a string (using unsafeSVG to preserve SVG namespace)
    let svgContent = `<svg class="l2d-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">`;

    // Grid lines
    for (let g = 0; g <= 4; g++) {
      const gy = pad + (g / 4) * (h - pad * 2);
      svgContent += `<line x1="${pad}" y1="${gy}" x2="${w - pad}" y2="${gy}" stroke="rgba(255,255,255,0.04)" stroke-width="0.5"/>`;
    }

    svgContent += `
      <defs>
        <linearGradient id="fpsGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(94,234,212,0.25)"/>
          <stop offset="100%" stop-color="rgba(94,234,212,0.02)"/>
        </linearGradient>
        <linearGradient id="ftGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(251,191,36,0.15)"/>
          <stop offset="100%" stop-color="rgba(251,191,36,0.01)"/>
        </linearGradient>
      </defs>
    `;

    if (ftAreaPath) {
      svgContent += `<path d="${ftAreaPath}" fill="url(#ftGrad)" stroke="none"/>`;
    }

    if (fpsAreaPath) {
      svgContent += `<path d="${fpsAreaPath}" fill="url(#fpsGrad)" stroke="none"/>`;
      svgContent += `<path d="${fpsLinePath}" fill="none" stroke="#5eead4" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    }

    if (fpsMax >= 60 && recent.length > 0) {
      const targetY = pad + (1 - 60 / fpsMax) * (h - pad * 2);
      svgContent += `<line x1="${pad}" y1="${targetY}" x2="${w - pad}" y2="${targetY}" stroke="rgba(94,234,212,0.25)" stroke-width="0.5" stroke-dasharray="3,3"/>`;
    }

    svgContent += `</svg>`;

    // Subsystem active flags
    const hasFSM = this._state.fsmState !== null;
    const hasEmotion = this._state.emotion !== null && this._state.emotion !== "neutral";
    const hasFilters = this._state.activeFilters.length > 0;
    const activeLayers = this._state.motionLayers.filter((l) => l.state !== "idle").length;
    const activeModules = this._state.proceduralModules.filter((m) => m.enabled).length;

    return html`
      <div class="l2d-section">
        <div class="l2d-section-header" @click=${() => this._toggleSection("perf")}>
          <span class="l2d-section-icon">${section.icon}</span>
          <span class="l2d-section-title">${section.title}</span>
          <span class="l2d-section-current ${avgFps >= 55 ? "happy" : avgFps >= 30 ? "thinking" : "angry"}">
            ${avgFps.toFixed(1)} FPS
          </span>
          <span class="l2d-section-arrow">${section.expanded ? "▼" : "▶"}</span>
        </div>
        ${section.expanded ? html`
          <div class="l2d-section-body">
            <!-- FPS Line Chart -->
            <div class="l2d-chart-wrap">
              ${unsafeSVG(svgContent)}
              <div class="l2d-chart-labels">
                <span class="l2d-chart-label">${fpsMax.toFixed(0)}</span>
                <span class="l2d-chart-label">${(fpsMax / 2).toFixed(0)}</span>
                <span class="l2d-chart-label">0</span>
              </div>
            </div>

            <!-- Stats grid -->
            <div class="l2d-perf-grid">
              <div class="l2d-perf-card">
                <span class="l2d-perf-value ${avgFrameTime < 16.7 ? "positive" : avgFrameTime < 33 ? "neutral" : "negative"}">${avgFrameTime.toFixed(1)}</span>
                <span class="l2d-perf-unit">ms</span>
                <span class="l2d-perf-label">帧时间</span>
              </div>
              <div class="l2d-perf-card">
                <span class="l2d-perf-value">${this._modelStats.parameterCount}</span>
                <span class="l2d-perf-unit">个</span>
                <span class="l2d-perf-label">参数</span>
              </div>
              <div class="l2d-perf-card">
                <span class="l2d-perf-value">${this._modelStats.drawableCount}</span>
                <span class="l2d-perf-unit">个</span>
                <span class="l2d-perf-label">Drawables</span>
              </div>
              <div class="l2d-perf-card">
                <span class="l2d-perf-value">${this._modelStats.partCount}</span>
                <span class="l2d-perf-unit">个</span>
                <span class="l2d-perf-label">部件</span>
              </div>
            </div>

            <!-- Subsystem load bars -->
            <div class="l2d-subsys-list">
              <div class="l2d-subsys-item">
                <span class="l2d-subsys-name">行为状态机</span>
                <div class="l2d-subsys-bar-wrap">
                  <div class="l2d-subsys-bar ${hasFSM ? "active" : ""}" style="width: ${hasFSM ? "100%" : "0%"}"></div>
                </div>
                <span class="l2d-subsys-status">${hasFSM ? "运行" : "待机"}</span>
              </div>
              <div class="l2d-subsys-item">
                <span class="l2d-subsys-name">情感时间线</span>
                <div class="l2d-subsys-bar-wrap">
                  <div class="l2d-subsys-bar ${hasEmotion ? "active" : ""}" style="width: ${hasEmotion ? "100%" : "0%"}"></div>
                </div>
                <span class="l2d-subsys-status">${hasEmotion ? "运行" : "待机"}</span>
              </div>
              <div class="l2d-subsys-item">
                <span class="l2d-subsys-name">动作层级</span>
                <div class="l2d-subsys-bar-wrap">
                  <div class="l2d-subsys-bar active" style="width: ${(activeLayers / Math.max(this._state.motionLayers.length, 1)) * 100}%"></div>
                </div>
                <span class="l2d-subsys-status">${activeLayers}/${this._state.motionLayers.length || 0}</span>
              </div>
              <div class="l2d-subsys-item">
                <span class="l2d-subsys-name">滤镜管线</span>
                <div class="l2d-subsys-bar-wrap">
                  <div class="l2d-subsys-bar ${hasFilters ? "active" : ""}" style="width: ${hasFilters ? Math.min(this._state.activeFilters.length * 20, 100) + "%" : "0%"}"></div>
                </div>
                <span class="l2d-subsys-status">${this._state.activeFilters.length} 个</span>
              </div>
              <div class="l2d-subsys-item">
                <span class="l2d-subsys-name">程序化动画</span>
                <div class="l2d-subsys-bar-wrap">
                  <div class="l2d-subsys-bar active" style="width: ${(activeModules / Math.max(this._state.proceduralModules.length, 1)) * 100}%"></div>
                </div>
                <span class="l2d-subsys-status">${activeModules}/${this._state.proceduralModules.length || 0}</span>
              </div>
            </div>
          </div>
        ` : ""}
      </div>
    `;
  }

  private _renderStatusBar(): TemplateResult {
    const fsmActive = this._state.fsmState !== null;
    const emotionActive = this._state.emotion !== null && this._state.emotion !== "neutral";
    const hasFilters = this._state.activeFilters.length > 0;

    return html`
      <div class="l2d-status-bar">
        <div class="l2d-status-item ${fsmActive ? "active" : ""}">
          <div class="l2d-status-dot ${fsmActive ? "on" : "off"}"></div>
          <span class="l2d-status-label">状态机</span>
          <span class="l2d-status-value">${fsmActive ? FSM_STATE_LABELS[this._state.fsmState!] ?? this._state.fsmState : "未激活"}</span>
        </div>
        <div class="l2d-status-item ${emotionActive ? "active" : ""}">
          <div class="l2d-status-dot ${emotionActive ? "on" : "off"}"></div>
          <span class="l2d-status-label">情感</span>
          <span class="l2d-status-value">${this._state.emotion ? EMOTION_LABELS[this._state.emotion] ?? this._state.emotion : "平静"}</span>
        </div>
        <div class="l2d-status-item ${hasFilters ? "active" : ""}">
          <div class="l2d-status-dot ${hasFilters ? "on" : "off"}"></div>
          <span class="l2d-status-label">滤镜</span>
          <span class="l2d-status-value">${hasFilters ? `${this._state.activeFilters.length} 个` : "无"}</span>
        </div>
      </div>
    `;
  }

  private _renderFSMSection(): TemplateResult {
    const section = this._sections.find((s) => s.id === "fsm");
    if (!section) return html``;
    const states = ["idle", "happy", "thinking", "talking", "embarrassed", "angry", "sleepy", "sad"];
    const fsm = this._controller?.getBehaviorFSM();

    return html`
      <div class="l2d-section">
        <div class="l2d-section-header" @click=${() => this._toggleSection("fsm")}>
          <span class="l2d-section-icon">${section.icon}</span>
          <span class="l2d-section-title">${section.title}</span>
          <span class="l2d-section-current ${this._state.fsmState ?? "none"}">
            ${this._state.fsmState ? (FSM_STATE_LABELS[this._state.fsmState] ?? this._state.fsmState) : "—"}
          </span>
          <span class="l2d-section-arrow">${section.expanded ? "▼" : "▶"}</span>
        </div>
        ${section.expanded ? html`
          <div class="l2d-section-body">
            <div class="l2d-chip-grid">
              ${states.map((s) => html`
                <button
                  class="l2d-chip ${this._state.fsmState === s ? "active" : ""} ${fsm ? (!fsm.canTransitionTo(s) ? "disabled" : "") : "disabled"}"
                  @click=${() => this._transitionFSM(s)}
                  ?disabled=${fsm ? !fsm.canTransitionTo(s) : true}
                >
                  <span class="l2d-chip-dot ${s}"></span>
                  ${FSM_STATE_LABELS[s] ?? s}
                </button>
              `)}
            </div>
          </div>
        ` : ""}
      </div>
    `;
  }

  private _renderEmotionSection(): TemplateResult {
    const section = this._sections.find((s) => s.id === "emotion");
    if (!section) return html``;
    const emotions = ["neutral", "happy", "sad", "angry", "embarrassed", "surprised", "sleepy", "thinking"];

    return html`
      <div class="l2d-section">
        <div class="l2d-section-header" @click=${() => this._toggleSection("emotion")}>
          <span class="l2d-section-icon">${section.icon}</span>
          <span class="l2d-section-title">${section.title}</span>
          <span class="l2d-section-current ${this._state.emotion ?? "neutral"}">
            ${this._state.emotion ? (EMOTION_LABELS[this._state.emotion] ?? this._state.emotion) : "—"}
          </span>
          <span class="l2d-section-arrow">${section.expanded ? "▼" : "▶"}</span>
        </div>
        ${section.expanded ? html`
          <div class="l2d-section-body">
            ${this._state.isTransitioning ? html`
              <div class="l2d-progress-wrap">
                <div class="l2d-progress-label">
                  <span>过渡中</span>
                  <span>${Math.round(this._state.transitionProgress * 100)}%</span>
                </div>
                <div class="l2d-progress-track">
                  <div class="l2d-progress-fill" style="width: ${this._state.transitionProgress * 100}%"></div>
                </div>
              </div>
            ` : ""}
            <div class="l2d-chip-grid">
              ${emotions.map((e) => html`
                <button
                  class="l2d-chip ${this._state.emotion === e ? "active" : ""}"
                  @click=${() => this._transitionEmotion(e)}
                >
                  <span class="l2d-chip-dot ${e}"></span>
                  ${EMOTION_LABELS[e] ?? e}
                </button>
              `)}
            </div>
          </div>
        ` : ""}
      </div>
    `;
  }

  private _renderMotionSection(): TemplateResult {
    const section = this._sections.find((s) => s.id === "motion");
    if (!section) return html``;
    const layerNames: Record<string, string> = {
      physics: "物理", idle: "待机", expression: "表情", talk: "说话", gesture: "手势",
    };

    return html`
      <div class="l2d-section">
        <div class="l2d-section-header" @click=${() => this._toggleSection("motion")}>
          <span class="l2d-section-icon">${section.icon}</span>
          <span class="l2d-section-title">${section.title}</span>
          <span class="l2d-section-badge">${this._state.motionLayers.filter((l) => l.state !== "idle").length} / ${this._state.motionLayers.length}</span>
          <span class="l2d-section-arrow">${section.expanded ? "▼" : "▶"}</span>
        </div>
        ${section.expanded ? html`
          <div class="l2d-section-body">
            ${this._state.motionLayers.length === 0 ? html`
              <div class="l2d-empty">暂无动作层数据</div>
            ` : html`
              <div class="l2d-layer-list">
                ${this._state.motionLayers.map((l) => html`
                  <div class="l2d-layer-item">
                    <div class="l2d-layer-info">
                      <span class="l2d-layer-name">${layerNames[l.name] ?? l.name}</span>
                      <span class="l2d-layer-state ${l.state}">${this._layerStateLabel(l.state)}</span>
                    </div>
                    <div class="l2d-layer-metrics">
                      <div class="l2d-layer-bar-wrap">
                        <div class="l2d-layer-bar" style="width: ${l.weight * 100}%"></div>
                      </div>
                      <span class="l2d-layer-value">${l.weight.toFixed(2)}</span>
                    </div>
                  </div>
                `)}
              </div>
            `}
          </div>
        ` : ""}
      </div>
    `;
  }

  private _layerStateLabel(state: string): string {
    const labels: Record<string, string> = {
      idle: "空闲", fadingIn: "淡入", active: "活跃", fadingOut: "淡出", stopped: "停止",
    };
    return labels[state] ?? state;
  }

  private _renderFilterSection(): TemplateResult {
    const section = this._sections.find((s) => s.id === "filter");
    if (!section) return html``;
    const presets: EffectPreset[] = ["evening-warm", "morning-cool", "neutral", "happy-glow", "shy-blush", "angry-red"];

    return html`
      <div class="l2d-section">
        <div class="l2d-section-header" @click=${() => this._toggleSection("filter")}>
          <span class="l2d-section-icon">${section.icon}</span>
          <span class="l2d-section-title">${section.title}</span>
          <span class="l2d-section-badge">${this._state.activeFilters.length}</span>
          <span class="l2d-section-arrow">${section.expanded ? "▼" : "▶"}</span>
        </div>
        ${section.expanded ? html`
          <div class="l2d-section-body">
            <!-- Active effects list with intensity sliders -->
            ${this._state.activeFilters.length > 0 ? html`
              <div class="l2d-active-filters">
                ${this._state.activeFilters.map((fx) => html`
                  <div class="l2d-active-filter-row">
                    <span class="l2d-active-filter-name">${fx.name}</span>
                    <input
                      class="l2d-param-slider"
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      .value=${String(fx.intensity)}
                      @input=${(e: Event) => this._setFilterIntensity(fx.id, Number((e.target as HTMLInputElement).value))}
                    />
                    <span class="l2d-param-value neutral">${(fx.intensity * 100).toFixed(0)}%</span>
                  </div>
                `)}
              </div>
            ` : ""}
            <div class="l2d-filter-grid">
              ${presets.map((p) => html`
                <button class="l2d-filter-card" @click=${() => this._applyFilter(p)}>
                  <div class="l2d-filter-preview ${p}"></div>
                  <span class="l2d-filter-name">${FILTER_LABELS[p] ?? p}</span>
                </button>
              `)}
            </div>
            <button class="l2d-btn l2d-btn-secondary" @click=${() => this._clearFilters()}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1L11 11M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              清除全部滤镜
            </button>
          </div>
        ` : ""}
      </div>
    `;
  }

  private _renderParamSection(): TemplateResult {
    const section = this._sections.find((s) => s.id === "params");
    if (!section) return html``;
    const params = this._controller?.getSemanticParameters() ?? [];

    return html`
      <div class="l2d-section">
        <div class="l2d-section-header" @click=${() => this._toggleSection("params")}>
          <span class="l2d-section-icon">${section.icon}</span>
          <span class="l2d-section-title">${section.title}</span>
          <span class="l2d-section-badge">${params.length}</span>
          <span class="l2d-section-arrow">${section.expanded ? "▼" : "▶"}</span>
        </div>
        ${section.expanded ? html`
          <div class="l2d-section-body">
            <div class="l2d-param-list">
              ${params.slice(0, 20).map((p) => html`
                <div class="l2d-param-row">
                  <span class="l2d-param-name" title="${p.name}">${p.name}</span>
                  <input
                    class="l2d-param-slider"
                    type="range"
                    min="-30"
                    max="30"
                    step="0.1"
                    .value=${String(p.value ?? 0)}
                    @input=${(e: Event) => this._setParamValue(p.name, Number((e.target as HTMLInputElement).value))}
                  />
                  <span class="l2d-param-value ${this._valueColor(p.value ?? 0)}">${(p.value ?? 0).toFixed(2)}</span>
                </div>
              `)}
            </div>
          </div>
        ` : ""}
      </div>
    `;
  }

  private _valueColor(v: number): string {
    if (v > 5) return "positive";
    if (v < -5) return "negative";
    return "neutral";
  }

  private _renderProceduralSection(): TemplateResult {
    const section = this._sections.find((s) => s.id === "procedural");
    if (!section) return html``;
    const moduleLabels: Record<string, string> = {
      Breathing: "呼吸动画", Blink: "眨眼动画", EyeTracking: "视线追踪",
    };

    return html`
      <div class="l2d-section">
        <div class="l2d-section-header" @click=${() => this._toggleSection("procedural")}>
          <span class="l2d-section-icon">${section.icon}</span>
          <span class="l2d-section-title">${section.title}</span>
          <span class="l2d-section-arrow">${section.expanded ? "▼" : "▶"}</span>
        </div>
        ${section.expanded ? html`
          <div class="l2d-section-body">
            <div class="l2d-module-list">
              ${this._state.proceduralModules.map((m) => html`
                <div class="l2d-module-item">
                  <div class="l2d-module-left">
                    <div class="l2d-module-dot ${m.enabled ? "on" : "off"}"></div>
                    <span class="l2d-module-name">${moduleLabels[m.name] ?? m.name}</span>
                  </div>
                  <span class="l2d-module-status ${m.enabled ? "on" : "off"}">${m.enabled ? "运行中" : "已停止"}</span>
                </div>
              `)}
            </div>
          </div>
        ` : ""}
      </div>
    `;
  }

  private _renderConflictSection(): TemplateResult {
    const section = this._sections.find((s) => s.id === "conflicts");
    if (!section) return html``;

    return html`
      <div class="l2d-section">
        <div class="l2d-section-header" @click=${() => this._toggleSection("conflicts")}>
          <span class="l2d-section-icon">${section.icon}</span>
          <span class="l2d-section-title">${section.title}</span>
          <span class="l2d-section-badge ${this._conflicts.length > 0 ? "warn" : ""}">${this._conflicts.length}</span>
          <span class="l2d-section-arrow">${section.expanded ? "▼" : "▶"}</span>
        </div>
        ${section.expanded ? html`
          <div class="l2d-section-body">
            ${this._conflicts.length === 0 ? html`
              <div class="l2d-empty">暂无系统间冲突</div>
            ` : html`
              <div class="l2d-conflict-list">
                ${this._conflicts.slice(-10).reverse().map((c) => html`
                  <div class="l2d-conflict-item">
                    <div class="l2d-conflict-meta">
                      <span class="l2d-conflict-param">${c.parameter}</span>
                      <span class="l2d-conflict-time">${new Date(c.timestamp).toLocaleTimeString("zh-CN")}</span>
                    </div>
                    <div class="l2d-conflict-detail">
                      <span class="l2d-conflict-loser">${c.losingSystem} <code>${c.losingValue.toFixed(2)}</code></span>
                      <span class="l2d-conflict-arrow">→</span>
                      <span class="l2d-conflict-winner">${c.winningSystem} <code>${c.winningValue.toFixed(2)}</code></span>
                    </div>
                  </div>
                `)}
              </div>
              <button class="l2d-btn l2d-btn-secondary" @click=${() => this._controller?.clearConflictLog()}>
                清除日志
              </button>
            `}
          </div>
        ` : ""}
      </div>
    `;
  }

  static styles = unsafeCSS(`
    :host {
      position: fixed;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      font-size: 13px;
      line-height: 1.5;
    }

    /* ── Indicator ── */
    .l2d-indicator {
      position: fixed;
      bottom: 16px;
      right: 16px;
      width: 44px;
      height: 44px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .l2d-indicator-icon {
      width: 40px;
      height: 40px;
      background: rgba(30, 30, 40, 0.9);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      transition: transform 0.2s, box-shadow 0.2s;
      position: relative;
      z-index: 2;
    }
    .l2d-indicator:hover .l2d-indicator-icon {
      transform: scale(1.08);
      box-shadow: 0 6px 24px rgba(0,0,0,0.4);
    }
    .l2d-indicator-pulse {
      position: absolute;
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: rgba(13, 115, 119, 0.3);
      animation: l2d-pulse 2s ease-out infinite;
      z-index: 1;
    }
    @keyframes l2d-pulse {
      0% { transform: scale(1); opacity: 0.6; }
      100% { transform: scale(1.6); opacity: 0; }
    }

    /* ── Panel ── */
    .l2d-panel {
      position: fixed;
      width: 360px;
      max-height: 85vh;
      background: rgba(22, 22, 30, 0.95);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      color: #e2e2e8;
    }

    /* ── Header ── */
    .l2d-header {
      padding: 14px 18px;
      background: rgba(255,255,255,0.03);
      border-bottom: 1px solid rgba(255,255,255,0.05);
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: grab;
      user-select: none;
    }
    .l2d-header:active { cursor: grabbing; }
    .l2d-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .l2d-header-icon { font-size: 18px; }
    .l2d-header-title {
      font-weight: 600;
      font-size: 14px;
      letter-spacing: 0.3px;
    }
    .l2d-header-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      background: rgba(13, 115, 119, 0.3);
      color: #5eead4;
      border-radius: 6px;
      border: 1px solid rgba(94, 234, 212, 0.15);
    }
    .l2d-header-close {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.05);
      border: none;
      border-radius: 8px;
      color: #888;
      cursor: pointer;
      transition: all 0.15s;
    }
    .l2d-header-close:hover {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    /* ── Status Bar ── */
    .l2d-status-bar {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .l2d-status-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
      padding: 8px 4px;
      border-radius: 10px;
      background: rgba(255,255,255,0.02);
      transition: background 0.2s;
    }
    .l2d-status-item.active { background: rgba(13, 115, 119, 0.08); }
    .l2d-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #444;
      box-shadow: 0 0 0 2px rgba(68,68,68,0.2);
      transition: all 0.3s;
    }
    .l2d-status-dot.on {
      background: #10b981;
      box-shadow: 0 0 6px rgba(16,185,129,0.4), 0 0 0 2px rgba(16,185,129,0.15);
    }
    .l2d-status-label {
      font-size: 11px;
      color: #777;
    }
    .l2d-status-value {
      font-size: 12px;
      font-weight: 600;
      color: #bbb;
    }
    .l2d-status-item.active .l2d-status-value { color: #5eead4; }

    /* ── Body ── */
    .l2d-body {
      overflow-y: auto;
      padding: 4px;
    }

    /* ── Section ── */
    .l2d-section {
      margin: 4px 6px;
      border-radius: 12px;
      overflow: hidden;
      background: rgba(255,255,255,0.015);
      border: 1px solid rgba(255,255,255,0.03);
    }
    .l2d-section-header {
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      user-select: none;
      transition: background 0.15s;
    }
    .l2d-section-header:hover { background: rgba(255,255,255,0.03); }
    .l2d-section-icon { font-size: 15px; opacity: 0.85; }
    .l2d-section-title {
      font-weight: 500;
      font-size: 13px;
      color: #c4c4ce;
    }
    .l2d-section-current {
      margin-left: auto;
      font-size: 12px;
      font-weight: 600;
      padding: 2px 10px;
      border-radius: 8px;
      background: rgba(255,255,255,0.06);
      color: #aaa;
    }
    .l2d-section-current.idle, .l2d-section-current.neutral { color: #94a3b8; }
    .l2d-section-current.happy { color: #fbbf24; background: rgba(251,191,36,0.1); }
    .l2d-section-current.sad { color: #60a5fa; background: rgba(96,165,250,0.1); }
    .l2d-section-current.angry { color: #f87171; background: rgba(248,113,113,0.1); }
    .l2d-section-current.embarrassed { color: #f472b6; background: rgba(244,114,182,0.1); }
    .l2d-section-current.thinking { color: #a78bfa; background: rgba(167,139,250,0.1); }
    .l2d-section-current.talking { color: #34d399; background: rgba(52,211,153,0.1); }
    .l2d-section-current.sleepy { color: #818cf8; background: rgba(129,140,248,0.1); }
    .l2d-section-current.surprised { color: #fb923c; background: rgba(251,146,60,0.1); }
    .l2d-section-badge {
      margin-left: auto;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 8px;
      background: rgba(255,255,255,0.06);
      color: #888;
    }
    .l2d-section-badge.warn {
      background: rgba(234,179,8,0.12);
      color: #eab308;
    }
    .l2d-section-arrow {
      font-size: 10px;
      color: #555;
      margin-left: 6px;
    }
    .l2d-section-body {
      padding: 0 14px 14px;
    }

    /* ── Chips ── */
    .l2d-chip-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }
    .l2d-chip {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 4px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 10px;
      color: #b0b0bc;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.15s;
    }
    .l2d-chip:hover:not(:disabled) {
      background: rgba(255,255,255,0.08);
      border-color: rgba(255,255,255,0.12);
      transform: translateY(-1px);
    }
    .l2d-chip:active:not(:disabled) { transform: translateY(0); }
    .l2d-chip.active {
      background: rgba(13, 115, 119, 0.2);
      border-color: rgba(94, 234, 212, 0.3);
      color: #5eead4;
      box-shadow: 0 0 12px rgba(94,234,212,0.08);
    }
    .l2d-chip:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
    .l2d-chip-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #555;
    }
    .l2d-chip.active .l2d-chip-dot { background: #5eead4; }
    .l2d-chip-dot.idle, .l2d-chip-dot.neutral { background: #64748b; }
    .l2d-chip-dot.happy { background: #fbbf24; }
    .l2d-chip-dot.sad { background: #60a5fa; }
    .l2d-chip-dot.angry { background: #f87171; }
    .l2d-chip-dot.embarrassed { background: #f472b6; }
    .l2d-chip-dot.thinking { background: #a78bfa; }
    .l2d-chip-dot.talking { background: #34d399; }
    .l2d-chip-dot.sleepy { background: #818cf8; }
    .l2d-chip-dot.surprised { background: #fb923c; }

    /* ── Progress ── */
    .l2d-progress-wrap {
      margin-bottom: 12px;
    }
    .l2d-progress-label {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #888;
      margin-bottom: 6px;
    }
    .l2d-progress-track {
      height: 6px;
      background: rgba(255,255,255,0.06);
      border-radius: 3px;
      overflow: hidden;
    }
    .l2d-progress-fill {
      height: 100%;
      background: rgba(94, 234, 212, 0.6);
      border-radius: 3px;
      transition: width 0.1s linear;
      box-shadow: 0 0 8px rgba(94,234,212,0.2);
    }

    /* ── Layers ── */
    .l2d-layer-list { display: flex; flex-direction: column; gap: 8px; }
    .l2d-layer-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 10px 12px;
      background: rgba(255,255,255,0.02);
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.03);
    }
    .l2d-layer-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .l2d-layer-name { font-weight: 500; font-size: 12px; color: #ccc; }
    .l2d-layer-state {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 6px;
      background: rgba(255,255,255,0.05);
      color: #777;
    }
    .l2d-layer-state.active {
      background: rgba(16,185,129,0.1);
      color: #34d399;
    }
    .l2d-layer-state.fadingIn, .l2d-layer-state.fadingOut {
      background: rgba(251,191,36,0.1);
      color: #fbbf24;
    }
    .l2d-layer-metrics {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .l2d-layer-bar-wrap {
      flex: 1;
      height: 4px;
      background: rgba(255,255,255,0.05);
      border-radius: 2px;
      overflow: hidden;
    }
    .l2d-layer-bar {
      height: 100%;
      background: rgba(94,234,212,0.5);
      border-radius: 2px;
      transition: width 0.3s;
    }
    .l2d-layer-value {
      font-size: 11px;
      font-family: 'SF Mono', monospace;
      color: #5eead4;
      min-width: 36px;
      text-align: right;
    }

    /* ── Active Filters ── */
    .l2d-active-filters {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 12px;
    }
    .l2d-active-filter-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 10px;
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.04);
    }
    .l2d-active-filter-name {
      width: 70px;
      font-size: 11px;
      color: #bbb;
      font-weight: 500;
    }

    /* ── Filters ── */
    .l2d-filter-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .l2d-filter-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 10px 4px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .l2d-filter-card:hover {
      background: rgba(255,255,255,0.06);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    .l2d-filter-preview {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.1);
    }
    .l2d-filter-preview.evening-warm { background: linear-gradient(135deg, #d97706, #92400e); }
    .l2d-filter-preview.morning-cool { background: linear-gradient(135deg, #60a5fa, #1e40af); }
    .l2d-filter-preview.neutral { background: linear-gradient(135deg, #9ca3af, #4b5563); }
    .l2d-filter-preview.happy-glow { background: linear-gradient(135deg, #fbbf24, #f59e0b); }
    .l2d-filter-preview.shy-blush { background: linear-gradient(135deg, #f472b6, #db2777); }
    .l2d-filter-preview.angry-red { background: linear-gradient(135deg, #f87171, #dc2626); }
    .l2d-filter-name { font-size: 11px; color: #aaa; }

    /* ── Params ── */
    .l2d-param-list { display: flex; flex-direction: column; gap: 6px; }
    .l2d-param-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 5px 8px;
      border-radius: 8px;
      background: rgba(255,255,255,0.015);
    }
    .l2d-param-name {
      width: 80px;
      font-size: 11px;
      color: #999;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: 'SF Mono', monospace;
    }
    .l2d-param-slider {
      flex: 1;
      height: 4px;
      -webkit-appearance: none;
      appearance: none;
      background: rgba(255,255,255,0.06);
      border-radius: 2px;
      outline: none;
    }
    .l2d-param-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #5eead4;
      cursor: pointer;
      box-shadow: 0 0 8px rgba(94,234,212,0.3);
      border: 2px solid rgba(22,22,30,0.8);
    }
    .l2d-param-value {
      width: 44px;
      text-align: right;
      font-family: 'SF Mono', monospace;
      font-size: 11px;
      font-weight: 600;
    }
    .l2d-param-value.positive { color: #34d399; }
    .l2d-param-value.negative { color: #f87171; }
    .l2d-param-value.neutral { color: #aaa; }

    /* ── Modules ── */
    .l2d-module-list { display: flex; flex-direction: column; gap: 8px; }
    .l2d-module-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      background: rgba(255,255,255,0.02);
      border-radius: 10px;
    }
    .l2d-module-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .l2d-module-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #444;
      transition: all 0.3s;
    }
    .l2d-module-dot.on {
      background: #10b981;
      box-shadow: 0 0 8px rgba(16,185,129,0.4);
    }
    .l2d-module-dot.off { background: #444; }
    .l2d-module-name { font-size: 12px; color: #bbb; }
    .l2d-module-status {
      font-size: 11px;
      padding: 3px 10px;
      border-radius: 6px;
      font-weight: 500;
    }
    .l2d-module-status.on {
      background: rgba(16,185,129,0.1);
      color: #34d399;
    }
    .l2d-module-status.off {
      background: rgba(255,255,255,0.04);
      color: #666;
    }

    /* ── Conflicts ── */
    .l2d-conflict-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 160px;
      overflow-y: auto;
    }
    .l2d-conflict-item {
      padding: 10px 12px;
      background: rgba(255,255,255,0.02);
      border-radius: 10px;
      border-left: 3px solid rgba(234,179,8,0.5);
    }
    .l2d-conflict-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    .l2d-conflict-param {
      font-weight: 600;
      font-size: 12px;
      color: #e8a87c;
    }
    .l2d-conflict-time {
      font-size: 10px;
      color: #555;
    }
    .l2d-conflict-detail {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: #777;
    }
    .l2d-conflict-loser code {
      color: #f87171;
      background: rgba(248,113,113,0.08);
      padding: 1px 5px;
      border-radius: 4px;
      font-family: 'SF Mono', monospace;
    }
    .l2d-conflict-winner code {
      color: #34d399;
      background: rgba(52,211,153,0.08);
      padding: 1px 5px;
      border-radius: 4px;
      font-family: 'SF Mono', monospace;
    }
    .l2d-conflict-arrow { color: #555; }

    /* ── Performance Chart ── */
    .l2d-chart-wrap {
      position: relative;
      height: 90px;
      margin-bottom: 14px;
      background: rgba(0,0,0,0.2);
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.04);
    }
    .l2d-chart {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    .l2d-chart-labels {
      position: absolute;
      right: 6px;
      top: 4px;
      bottom: 4px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: flex-end;
      pointer-events: none;
    }
    .l2d-chart-label {
      font-size: 9px;
      color: #555;
      font-family: 'SF Mono', monospace;
    }

    /* ── Performance Grid ── */
    .l2d-perf-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }
    .l2d-perf-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 10px 4px;
      background: rgba(255,255,255,0.02);
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.04);
    }
    .l2d-perf-value {
      font-size: 18px;
      font-weight: 700;
      font-family: 'SF Mono', monospace;
      color: #e2e2e8;
      line-height: 1;
    }
    .l2d-perf-value.positive { color: #34d399; }
    .l2d-perf-value.negative { color: #f87171; }
    .l2d-perf-value.neutral { color: #fbbf24; }
    .l2d-perf-unit {
      font-size: 9px;
      color: #666;
      font-family: 'SF Mono', monospace;
    }
    .l2d-perf-label {
      font-size: 10px;
      color: #777;
      margin-top: 2px;
    }

    /* ── Subsystem Load Bars ── */
    .l2d-subsys-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .l2d-subsys-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      background: rgba(255,255,255,0.015);
      border-radius: 8px;
    }
    .l2d-subsys-name {
      width: 72px;
      font-size: 11px;
      color: #999;
    }
    .l2d-subsys-bar-wrap {
      flex: 1;
      height: 5px;
      background: rgba(255,255,255,0.05);
      border-radius: 3px;
      overflow: hidden;
    }
    .l2d-subsys-bar {
      height: 100%;
      width: 0%;
      background: #555;
      border-radius: 3px;
      transition: width 0.4s ease;
    }
    .l2d-subsys-bar.active {
      background: linear-gradient(90deg, #0d7377, #5eead4);
      box-shadow: 0 0 8px rgba(94,234,212,0.15);
    }
    .l2d-subsys-status {
      width: 44px;
      text-align: right;
      font-size: 10px;
      color: #666;
      font-family: 'SF Mono', monospace;
    }

    /* ── Buttons ── */
    .l2d-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      padding: 10px;
      margin-top: 10px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 10px;
      color: #aaa;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.15s;
    }
    .l2d-btn:hover {
      background: rgba(255,255,255,0.08);
      color: #ddd;
    }
    .l2d-btn-secondary {
      background: rgba(239,68,68,0.06);
      border-color: rgba(239,68,68,0.12);
      color: #f87171;
    }
    .l2d-btn-secondary:hover {
      background: rgba(239,68,68,0.1);
    }

    /* ── Empty ── */
    .l2d-empty {
      text-align: center;
      padding: 20px;
      color: #555;
      font-size: 12px;
    }
  `);
}

customElements.define("live2d-dev-tools", Live2dDevTools);
