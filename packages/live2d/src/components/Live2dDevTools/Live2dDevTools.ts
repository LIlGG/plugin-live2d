import { UnoLitElement } from "@/live2d/common/UnoLitElement";
import type { Live2dRuntimeController } from "@/live2d/runtime/controller";
import type {
  ConflictEntry,
  ControllerState,
} from "@/live2d/runtime/controller/types";
import type { EffectPreset } from "@/live2d/runtime/filters/types";
import { type TemplateResult, html, unsafeCSS } from "lit";
import { state } from "lit/decorators.js";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";

interface Section {
  id: string;
  title: string;
  expanded: boolean;
}

const FSM_LABELS: Record<string, string> = {
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

const STATE_COLORS: Record<string, string> = {
  idle: "text-slate-400 bg-slate-400/10",
  neutral: "text-slate-400 bg-slate-400/10",
  happy: "text-amber-400 bg-amber-400/10",
  sad: "text-blue-400 bg-blue-400/10",
  angry: "text-red-400 bg-red-400/10",
  embarrassed: "text-pink-400 bg-pink-400/10",
  thinking: "text-violet-400 bg-violet-400/10",
  talking: "text-emerald-400 bg-emerald-400/10",
  sleepy: "text-indigo-400 bg-indigo-400/10",
  surprised: "text-orange-400 bg-orange-400/10",
  none: "text-gray-500 bg-white/5",
};

const DOT_COLORS: Record<string, string> = {
  idle: "bg-slate-500",
  neutral: "bg-slate-500",
  happy: "bg-amber-400",
  sad: "bg-blue-400",
  angry: "bg-red-400",
  embarrassed: "bg-pink-400",
  thinking: "bg-violet-400",
  talking: "bg-emerald-400",
  sleepy: "bg-indigo-400",
  surprised: "bg-orange-400",
};

export class Live2dDevTools extends UnoLitElement {
  @state() private _visible = false;
  @state() private _state: ControllerState = {
    fsmState: null,
    emotion: null,
    isTransitioning: false,
    transitionProgress: 0,
    activeFilters: [],
    motionLayers: [],
    proceduralModules: [],
  };
  @state() private _conflicts: ConflictEntry[] = [];
  @state() private _sections: Section[] = [
    { id: "perf", title: "性能监控", expanded: true },
    { id: "fsm", title: "行为状态机", expanded: false },
    { id: "emotion", title: "情感时间线", expanded: false },
    { id: "motion", title: "动作层级", expanded: false },
    { id: "filter", title: "滤镜效果", expanded: false },
    { id: "params", title: "语义参数", expanded: false },
    { id: "procedural", title: "程序化动画", expanded: false },
    { id: "conflicts", title: "冲突日志", expanded: false },
  ];

  private _perfSamples: Array<{ fps: number; frameTime: number }> = [];
  private readonly _MAX_PERF = 120;
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

  setController(c: Live2dRuntimeController): void {
    this._controller = c;
  }

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("keydown", this._handleKeyDown);
    const saved = localStorage.getItem("live2d-devtools-position");
    if (saved) {
      try {
        const p = JSON.parse(saved);
        this._panelX = p.x ?? 16;
        this._panelY = p.y ?? 16;
      } catch {}
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
      this._visible = !this._visible;
    }
  };

  private _pollState(): void {
    if (!this._controller) return;
    this._state = this._controller.getState();
    this._conflicts = this._controller.getConflictLog();
    this._updateModelStats();
  }

  private _collectPerf = (t: number): void => {
    if (this._lastRafTime > 0) {
      const ft = t - this._lastRafTime;
      const fps = ft > 0 ? 1000 / ft : 60;
      this._perfSamples.push({ fps: Math.min(fps, 120), frameTime: ft });
      if (this._perfSamples.length > this._MAX_PERF) this._perfSamples.shift();
      const perfExpanded = this._sections.find(
        (s) => s.id === "perf",
      )?.expanded;
      if (perfExpanded && this._visible) this.requestUpdate();
    }
    this._lastRafTime = t;
    this._rafId = requestAnimationFrame(this._collectPerf);
  };

  private _updateModelStats(): void {
    const semanticLayer = this._controller?.getSemanticLayer();
    if (!semanticLayer) return;
    const paramCount = semanticLayer.getCapabilityProfile().detected.size;
    let drawableCount = 0;
    let partCount = 0;
    let textureCount = 0;
    try {
      const model = (semanticLayer as unknown as Record<string, unknown>)
        .sourceModel as
        | {
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
          }
        | undefined;
      if (model?.internalModel) {
        const im = model.internalModel;
        const core = im.coreModel;
        if (core) {
          drawableCount =
            (typeof core.getDrawableCount === "function"
              ? core.getDrawableCount()
              : undefined) ??
            core._drawableCount ??
            core.drawableCount ??
            0;
          partCount =
            (typeof core.getPartCount === "function"
              ? core.getPartCount()
              : undefined) ??
            core._partCount ??
            core.partCount ??
            0;
        } else {
          if (Array.isArray(im.parts)) partCount = im.parts.length;
          const ds = im.drawables ?? im.drawDataList;
          if (Array.isArray(ds)) drawableCount = ds.length;
        }
        textureCount = Array.isArray(im.textures) ? im.textures.length : 0;
      }
    } catch {}
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
    const rect = this.shadowRoot
      ?.querySelector("[data-devtools-panel]")
      ?.getBoundingClientRect();
    if (rect)
      this._dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
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
    localStorage.setItem(
      "live2d-devtools-position",
      JSON.stringify({ x: this._panelX, y: this._panelY }),
    );
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
  private _setFilterIntensity(id: string, v: number): void {
    this._controller?.getFilterPipeline().setIntensity(id, v);
  }
  private _setParamValue(p: string, v: number): void {
    this._controller
      ?.getSemanticLayer()
      .setSemantic(p, v, "override", "manual", 1);
  }

  private _sectionHeader(
    id: string,
    current: string,
    extra?: TemplateResult,
  ): TemplateResult {
    const s = this._sections.find((sec) => sec.id === id);
    if (!s) return html``;
    return html`
      <div class="flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer select-none hover:bg-white/[0.03] transition-colors rounded-xl"
           @click=${() => this._toggleSection(id)}>
        <span class="text-sm font-medium text-gray-300">${s.title}</span>
        <span class="ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-white/5 ${STATE_COLORS[current] ?? STATE_COLORS.none}">
          ${FSM_LABELS[current] ?? EMOTION_LABELS[current] ?? current ?? "—"}
        </span>
        ${extra}
        <span class="text-xs text-gray-600 ml-1">${s.expanded ? "▼" : "▶"}</span>
      </div>
    `;
  }

  private _sectionWrap(
    id: string,
    current: string,
    body: TemplateResult,
    extra?: TemplateResult,
  ): TemplateResult {
    const s = this._sections.find((sec) => sec.id === id);
    if (!s) return html``;
    return html`
      <div class="mx-1.5 my-1 rounded-xl overflow-hidden bg-white/[0.015] border border-white/[0.03]">
        ${this._sectionHeader(id, current, extra)}
        ${s.expanded ? html`<div class="px-3.5 pt-3 pb-3.5">${body}</div>` : ""}
      </div>
    `;
  }

  render(): TemplateResult {
    if (!this._visible)
      return html`
      <div class="fixed bottom-4 right-4 w-11 h-11 flex items-center justify-center cursor-pointer group"
           @click=${() => {
             this._visible = true;
           }} title="Live2D 调试面板 (Ctrl+Shift+D)">
        <div class="w-10 h-10 flex items-center justify-center text-xl bg-[rgba(30,30,40,0.9)] backdrop-blur-xl border border-white/10 rounded-xl shadow-lg transition-all group-hover:scale-[1.08] group-hover:shadow-xl relative z-10">🎛️</div>
        <div class="absolute w-10 h-10 rounded-xl bg-[rgba(13,115,119,0.3)] animate-pulse z-0"></div>
      </div>
    `;

    return html`
      <div data-devtools-panel class="fixed w-[360px] max-h-[85vh] bg-[rgba(22,22,30,0.95)] backdrop-blur-xl border border-white/[0.06] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-[#e2e2e8] text-[13px] leading-relaxed"
           style="left:${this._panelX}px;top:${this._panelY}px;">

        <div class="px-[18px] py-3.5 bg-white/[0.03] border-b border-white/[0.05] flex justify-between items-center cursor-grab active:cursor-grabbing select-none"
             @mousedown=${this._startDrag}>
          <div class="flex items-center gap-2.5">
            <span class="text-lg">🎛️</span>
            <span class="font-semibold text-sm tracking-wide">Live2D 实时调试台</span>
            <span class="text-[10px] font-bold px-1.5 py-0.5 bg-[rgba(13,115,119,0.3)] text-teal-300 rounded-md border border-teal-300/15">DEV</span>
          </div>
          <button class="w-7 h-7 flex items-center justify-center bg-white/5 rounded-lg text-gray-500 hover:bg-red-500/20 hover:text-red-400 transition-all border-none cursor-pointer"
                  @click=${() => {
                    this._visible = false;
                  }} title="关闭">✕</button>
        </div>

        <div class="overflow-y-auto p-1">
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
    const samples = this._perfSamples;
    const recent = samples.slice(-60);
    const avgFps =
      recent.length > 0
        ? recent.reduce((s, d) => s + d.fps, 0) / recent.length
        : 0;
    const avgFt =
      recent.length > 0
        ? recent.reduce((s, d) => s + d.frameTime, 0) / recent.length
        : 0;
    const maxFps =
      recent.length > 0 ? Math.max(...recent.map((d) => d.fps)) : 60;
    const fpsMax = Math.max(66, maxFps * 1.1);
    const w = 320;
    const h = 80;
    const pad = 4;

    const fpsLine: string[] = [];
    const fpsArea: string[] = [];
    const step = recent.length > 1 ? (w - pad * 2) / (recent.length - 1) : 0;
    for (let i = 0; i < recent.length; i++) {
      const x = pad + i * step;
      const y = pad + (1 - recent[i].fps / fpsMax) * (h - pad * 2);
      const cmd = i === 0 ? "M" : "L";
      fpsLine.push(`${cmd}${x.toFixed(1)},${y.toFixed(1)}`);
      fpsArea.push(`${cmd}${x.toFixed(1)},${y.toFixed(1)}`);
    }
    if (recent.length > 0) {
      const lastX = pad + (recent.length - 1) * step;
      fpsArea.push(`L${lastX.toFixed(1)},${h - pad}L${pad},${h - pad}Z`);
    }

    const ftMax = Math.max(33, ...recent.map((d) => d.frameTime));
    const ftArea: string[] = [];
    for (let i = 0; i < recent.length; i++) {
      const x = pad + i * step;
      const y = pad + (1 - recent[i].frameTime / ftMax) * (h - pad * 2);
      ftArea.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
    }
    if (recent.length > 0) {
      const lastX = pad + (recent.length - 1) * step;
      ftArea.push(`L${lastX.toFixed(1)},${h - pad}L${pad},${h - pad}Z`);
    }

    let svg = `<svg class="absolute inset-0 w-full h-full" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">`;
    for (let g = 0; g <= 4; g++) {
      const gy = pad + (g / 4) * (h - pad * 2);
      svg += `<line x1="${pad}" y1="${gy}" x2="${w - pad}" y2="${gy}" stroke="rgba(255,255,255,0.04)" stroke-width="0.5"/>`;
    }
    svg += `<defs><linearGradient id="fpsGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(94,234,212,0.25)"/><stop offset="100%" stop-color="rgba(94,234,212,0.02)"/></linearGradient><linearGradient id="ftGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(251,191,36,0.15)"/><stop offset="100%" stop-color="rgba(251,191,36,0.01)"/></linearGradient></defs>`;
    if (ftArea.length)
      svg += `<path d="${ftArea.join("")}" fill="url(#ftGrad)" stroke="none"/>`;
    if (fpsArea.length)
      svg += `<path d="${fpsArea.join("")}" fill="url(#fpsGrad)" stroke="none"/><path d="${fpsLine.join("")}" fill="none" stroke="#5eead4" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    if (fpsMax >= 60 && recent.length > 0) {
      const ty = pad + (1 - 60 / fpsMax) * (h - pad * 2);
      svg += `<line x1="${pad}" y1="${ty}" x2="${w - pad}" y2="${ty}" stroke="rgba(94,234,212,0.25)" stroke-width="0.5" stroke-dasharray="3,3"/>`;
    }
    svg += "</svg>";

    const hasFSM = this._state.fsmState !== null;
    const hasEmotion =
      this._state.emotion !== null && this._state.emotion !== "neutral";
    const hasFilters = this._state.activeFilters.length > 0;
    const activeLayers = this._state.motionLayers.filter(
      (l) => l.state !== "idle",
    ).length;
    const activeMods = this._state.proceduralModules.filter(
      (m) => m.enabled,
    ).length;

    const fpsColor =
      avgFps >= 55
        ? "text-emerald-400"
        : avgFps >= 30
          ? "text-amber-400"
          : "text-red-400";

    const extra = html`<span class="text-xs font-semibold px-2 py-0.5 rounded-lg bg-white/5 ${fpsColor}">${avgFps.toFixed(1)} FPS</span>`;

    const body = html`
      <div class="relative h-[90px] mb-3.5 bg-black/20 rounded-xl overflow-hidden border border-white/[0.04]">
        ${unsafeSVG(svg)}
        <div class="absolute right-1.5 top-1 bottom-1 flex flex-col justify-between items-end pointer-events-none">
          <span class="text-[9px] text-gray-600 font-mono">${fpsMax.toFixed(0)}</span>
          <span class="text-[9px] text-gray-600 font-mono">${(fpsMax / 2).toFixed(0)}</span>
          <span class="text-[9px] text-gray-600 font-mono">0</span>
        </div>
      </div>

      <div class="grid grid-cols-4 gap-2 mb-3.5">
        ${[
          {
            v: avgFt.toFixed(1),
            u: "ms",
            l: "帧时间",
            c:
              avgFt < 16.7
                ? "text-emerald-400"
                : avgFt < 33
                  ? "text-amber-400"
                  : "text-red-400",
          },
          {
            v: String(this._modelStats.parameterCount),
            u: "个",
            l: "参数",
            c: "",
          },
          {
            v: String(this._modelStats.drawableCount),
            u: "个",
            l: "Drawables",
            c: "",
          },
          { v: String(this._modelStats.partCount), u: "个", l: "部件", c: "" },
        ].map(
          (s) => html`
            <div class="flex flex-col items-center gap-0.5 py-2.5 bg-white/[0.02] rounded-xl border border-white/[0.04]">
              <span class="text-lg font-bold font-mono ${s.c || "text-gray-200"}">${s.v}</span>
              <span class="text-[9px] text-gray-500 font-mono">${s.u}</span>
              <span class="text-[10px] text-gray-500 mt-0.5">${s.l}</span>
            </div>
          `,
        )}
      </div>

      <div class="flex flex-col gap-2">
        ${[
          { n: "行为状态机", a: hasFSM, v: hasFSM ? "运行" : "待机" },
          { n: "情感时间线", a: hasEmotion, v: hasEmotion ? "运行" : "待机" },
          {
            n: "动作层级",
            a: activeLayers > 0,
            v: `${activeLayers}/${this._state.motionLayers.length || 0}`,
          },
          {
            n: "滤镜管线",
            a: hasFilters,
            v: `${this._state.activeFilters.length} 个`,
          },
          {
            n: "程序化动画",
            a: activeMods > 0,
            v: `${activeMods}/${this._state.proceduralModules.length || 0}`,
          },
        ].map(
          (s) => html`
            <div class="flex items-center gap-2.5 px-2.5 py-2 bg-white/[0.015] rounded-lg">
              <span class="w-[72px] text-[11px] text-gray-500">${s.n}</span>
              <div class="flex-1 h-[5px] bg-white/5 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-[400ms] ${s.a ? "bg-gradient-to-r from-[#0d7377] to-teal-300 shadow-[0_0_8px_rgba(94,234,212,0.15)]" : "bg-gray-600 w-0"}"
                     style="width:${s.a ? "100%" : "0%"}"></div>
              </div>
              <span class="w-11 text-right text-[10px] text-gray-500 font-mono">${s.v}</span>
            </div>
          `,
        )}
      </div>
    `;

    return this._sectionWrap("perf", "", body, extra);
  }

  private _renderStatusBar(): TemplateResult {
    const fsmState = this._state.fsmState;
    const fsmActive = fsmState !== null;
    const emotionActive =
      this._state.emotion !== null && this._state.emotion !== "neutral";
    const hasFilters = this._state.activeFilters.length > 0;

    const items = [
      {
        label: "状态机",
        active: fsmActive,
        value: fsmActive ? (FSM_LABELS[fsmState] ?? fsmState) : "未激活",
      },
      {
        label: "情感",
        active: emotionActive,
        value: this._state.emotion
          ? (EMOTION_LABELS[this._state.emotion] ?? this._state.emotion)
          : "平静",
      },
      {
        label: "滤镜",
        active: hasFilters,
        value: hasFilters ? `${this._state.activeFilters.length} 个` : "无",
      },
    ];

    return html`
      <div class="flex gap-2 px-4 py-3 border-b border-white/[0.04]">
        ${items.map(
          (item) => html`
          <div class="flex-1 flex flex-col items-center gap-1.5 py-2 rounded-xl bg-white/[0.02] ${item.active ? "bg-[rgba(13,115,119,0.08)]" : ""} transition-colors">
            <div class="w-2 h-2 rounded-full transition-all ${item.active ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" : "bg-gray-700"}"></div>
            <span class="text-[11px] text-gray-500">${item.label}</span>
            <span class="text-xs font-semibold ${item.active ? "text-teal-300" : "text-gray-400"}">${item.value}</span>
          </div>
        `,
        )}
      </div>
    `;
  }

  private _renderFSMSection(): TemplateResult {
    const states = [
      "idle",
      "happy",
      "thinking",
      "talking",
      "embarrassed",
      "angry",
      "sleepy",
      "sad",
    ];
    const fsm = this._controller?.getBehaviorFSM();
    const body = html`
      <div class="grid grid-cols-4 gap-2">
        ${states.map(
          (s) => html`
          <button class="flex items-center justify-center gap-1.5 py-2 bg-white/[0.04] border border-white/[0.06] rounded-xl text-xs text-gray-300 transition-all hover:bg-white/[0.08] hover:border-white/[0.12] hover:-translate-y-px active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed ${this._state.fsmState === s ? "bg-[rgba(13,115,119,0.2)] border-teal-300/30 text-teal-300 shadow-[0_0_12px_rgba(94,234,212,0.08)]" : ""}"
                  @click=${() => this._transitionFSM(s)}
                  ?disabled=${fsm ? !fsm.canTransitionTo(s) : true}>
            <span class="w-1.5 h-1.5 rounded-full ${DOT_COLORS[s] ?? "bg-gray-600"} ${this._state.fsmState === s ? "bg-teal-300" : ""}"></span>
            ${FSM_LABELS[s] ?? s}
          </button>
        `,
        )}
      </div>
    `;
    return this._sectionWrap("fsm", this._state.fsmState ?? "", body);
  }

  private _renderEmotionSection(): TemplateResult {
    const emotions = [
      "neutral",
      "happy",
      "sad",
      "angry",
      "embarrassed",
      "surprised",
      "sleepy",
      "thinking",
    ];
    const body = html`
      ${
        this._state.isTransitioning
          ? html`
        <div class="mb-3">
          <div class="flex justify-between text-[11px] text-gray-500 mb-1.5">
            <span>过渡中</span><span>${Math.round(this._state.transitionProgress * 100)}%</span>
          </div>
          <div class="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div class="h-full bg-teal-300/60 rounded-full transition-all shadow-[0_0_8px_rgba(94,234,212,0.2)]"
                 style="width:${this._state.transitionProgress * 100}%"></div>
          </div>
        </div>
      `
          : ""
      }
      <div class="grid grid-cols-4 gap-2">
        ${emotions.map(
          (e) => html`
          <button class="flex items-center justify-center gap-1.5 py-2 bg-white/[0.04] border border-white/[0.06] rounded-xl text-xs text-gray-300 transition-all hover:bg-white/[0.08] hover:border-white/[0.12] hover:-translate-y-px active:translate-y-0 ${this._state.emotion === e ? "bg-[rgba(13,115,119,0.2)] border-teal-300/30 text-teal-300 shadow-[0_0_12px_rgba(94,234,212,0.08)]" : ""}"
                  @click=${() => this._transitionEmotion(e)}>
            <span class="w-1.5 h-1.5 rounded-full ${DOT_COLORS[e] ?? "bg-gray-600"} ${this._state.emotion === e ? "bg-teal-300" : ""}"></span>
            ${EMOTION_LABELS[e] ?? e}
          </button>
        `,
        )}
      </div>
    `;
    return this._sectionWrap("emotion", this._state.emotion ?? "", body);
  }

  private _renderMotionSection(): TemplateResult {
    const layerNames: Record<string, string> = {
      physics: "物理",
      idle: "待机",
      expression: "表情",
      talk: "说话",
      gesture: "手势",
    };
    const stateLabels: Record<string, string> = {
      idle: "空闲",
      fadingIn: "淡入",
      active: "活跃",
      fadingOut: "淡出",
      stopped: "停止",
    };
    const activeCount = this._state.motionLayers.filter(
      (l) => l.state !== "idle",
    ).length;

    const body =
      this._state.motionLayers.length === 0
        ? html`<div class="text-center py-5 text-gray-600 text-xs">暂无动作层数据</div>`
        : html`
        <div class="flex flex-col gap-2">
          ${this._state.motionLayers.map(
            (l) => html`
            <div class="flex flex-col gap-1.5 py-2.5 px-3 bg-white/[0.02] rounded-xl border border-white/[0.03]">
              <div class="flex justify-between items-center">
                <span class="font-medium text-xs text-gray-300">${layerNames[l.name] ?? l.name}</span>
                <span class="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.05] text-gray-500 ${l.state === "active" ? "bg-emerald-500/10 text-emerald-400" : (l.state === "fadingIn" || l.state === "fadingOut") ? "bg-amber-400/10 text-amber-400" : ""}">${stateLabels[l.state] ?? l.state}</span>
              </div>
              <div class="flex items-center gap-2.5">
                <div class="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div class="h-full bg-teal-300/50 rounded-full transition-all" style="width:${l.weight * 100}%"></div>
                </div>
                <span class="text-[11px] font-mono text-teal-300 min-w-[36px] text-right">${l.weight.toFixed(2)}</span>
              </div>
            </div>
          `,
          )}
        </div>
      `;

    return this._sectionWrap(
      "motion",
      "",
      body,
      html`<span class="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-white/5 text-gray-500">${activeCount}/${this._state.motionLayers.length}</span>`,
    );
  }

  private _renderFilterSection(): TemplateResult {
    const presets: EffectPreset[] = [
      "evening-warm",
      "morning-cool",
      "neutral",
      "happy-glow",
      "shy-blush",
      "angry-red",
    ];
    const previewGradients: Record<string, string> = {
      "evening-warm": "from-amber-600 to-amber-800",
      "morning-cool": "from-blue-400 to-blue-800",
      neutral: "from-gray-400 to-gray-600",
      "happy-glow": "from-amber-300 to-amber-500",
      "shy-blush": "from-pink-400 to-pink-600",
      "angry-red": "from-red-400 to-red-600",
    };

    const body = html`
      ${
        this._state.activeFilters.length > 0
          ? html`
        <div class="flex flex-col gap-2 mb-3">
          ${this._state.activeFilters.map(
            (fx) => html`
            <div class="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span class="w-[70px] text-[11px] text-gray-400 font-medium">${fx.name}</span>
              <input class="flex-1 h-1 bg-white/[0.06] rounded-full outline-none appearance-none cursor-pointer"
                     type="range" min="0" max="1" step="0.01" .value=${String(fx.intensity)}
                     @input=${(e: Event) => this._setFilterIntensity(fx.id, Number((e.target as HTMLInputElement).value))}/>
              <span class="w-11 text-right font-mono text-[11px] text-gray-400">${(fx.intensity * 100).toFixed(0)}%</span>
            </div>
          `,
          )}
        </div>
      `
          : ""
      }
      <div class="grid grid-cols-3 gap-2">
        ${presets.map(
          (p) => html`
          <button class="flex flex-col items-center gap-1.5 py-2.5 bg-white/[0.03] border border-white/[0.05] rounded-xl cursor-pointer transition-all hover:bg-white/[0.06] hover:-translate-y-0.5 hover:shadow-lg"
                  @click=${() => this._applyFilter(p)}>
            <div class="w-8 h-8 rounded-full border-2 border-white/10 bg-gradient-to-br ${previewGradients[p] ?? "from-gray-500 to-gray-700"}"></div>
            <span class="text-[11px] text-gray-400">${FILTER_LABELS[p] ?? p}</span>
          </button>
        `,
        )}
      </div>
      <button class="flex items-center justify-center gap-1.5 w-full py-2.5 mt-2.5 bg-red-500/5 border border-red-500/10 rounded-xl text-xs text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
              @click=${() => this._clearFilters()}>清除全部滤镜</button>
    `;

    return this._sectionWrap(
      "filter",
      "",
      body,
      html`<span class="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-white/5 text-gray-500">${this._state.activeFilters.length}</span>`,
    );
  }

  private _renderParamSection(): TemplateResult {
    const params = this._controller?.getSemanticParameters() ?? [];
    const valueColor = (v: number) =>
      v > 5 ? "text-emerald-400" : v < -5 ? "text-red-400" : "text-gray-400";

    const body = html`
      <div class="flex flex-col gap-1.5">
        ${params.slice(0, 20).map(
          (p) => html`
          <div class="flex items-center gap-2.5 px-2 py-1 rounded-lg bg-white/[0.015]">
            <span class="w-20 text-[11px] text-gray-500 font-mono truncate" title="${p.name}">${p.name}</span>
            <input class="flex-1 h-1 bg-white/[0.06] rounded-full outline-none appearance-none cursor-pointer"
                   type="range" min="-30" max="30" step="0.1" .value=${String(p.value ?? 0)}
                   @input=${(e: Event) => this._setParamValue(p.name, Number((e.target as HTMLInputElement).value))}/>
            <span class="w-11 text-right font-mono text-[11px] font-semibold ${valueColor(p.value ?? 0)}">${(p.value ?? 0).toFixed(2)}</span>
          </div>
        `,
        )}
      </div>
    `;

    return this._sectionWrap(
      "params",
      "",
      body,
      html`<span class="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-white/5 text-gray-500">${params.length}</span>`,
    );
  }

  private _renderProceduralSection(): TemplateResult {
    const moduleLabels: Record<string, string> = {
      Breathing: "呼吸动画",
      Blink: "眨眼动画",
      EyeTracking: "视线追踪",
    };
    const body = html`
      <div class="flex flex-col gap-2">
        ${this._state.proceduralModules.map(
          (m) => html`
          <div class="flex justify-between items-center py-2.5 px-3 bg-white/[0.02] rounded-xl">
            <div class="flex items-center gap-2.5">
              <div class="w-2 h-2 rounded-full transition-all ${m.enabled ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-gray-700"}"></div>
              <span class="text-xs text-gray-400">${moduleLabels[m.name] ?? m.name}</span>
            </div>
            <span class="text-[11px] px-2.5 py-0.5 rounded-md font-medium ${m.enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-white/[0.04] text-gray-500"}">${m.enabled ? "运行中" : "已停止"}</span>
          </div>
        `,
        )}
      </div>
    `;
    return this._sectionWrap("procedural", "", body);
  }

  private _renderConflictSection(): TemplateResult {
    const hasConflicts = this._conflicts.length > 0;
    const body = !hasConflicts
      ? html`<div class="text-center py-5 text-gray-600 text-xs">暂无系统间冲突</div>`
      : html`
        <div class="flex flex-col gap-2 max-h-40 overflow-y-auto">
          ${this._conflicts
            .slice(-10)
            .reverse()
            .map(
              (c) => html`
            <div class="py-2.5 px-3 bg-white/[0.02] rounded-xl border-l-[3px] border-amber-500/50">
              <div class="flex justify-between items-center mb-1">
                <span class="font-semibold text-xs text-orange-300">${c.parameter}</span>
                <span class="text-[10px] text-gray-600">${new Date(c.timestamp).toLocaleTimeString("zh-CN")}</span>
              </div>
              <div class="flex items-center gap-2 text-[11px] text-gray-500">
                <span>${c.losingSystem} <code class="text-red-400 bg-red-400/8 px-1 rounded font-mono">${c.losingValue.toFixed(2)}</code></span>
                <span class="text-gray-600">→</span>
                <span>${c.winningSystem} <code class="text-emerald-400 bg-emerald-400/8 px-1 rounded font-mono">${c.winningValue.toFixed(2)}</code></span>
              </div>
            </div>
          `,
            )}
        </div>
        <button class="flex items-center justify-center gap-1.5 w-full py-2.5 mt-2.5 bg-white/5 border border-white/[0.08] rounded-xl text-xs text-gray-400 hover:bg-white/[0.08] transition-all cursor-pointer"
                @click=${() => this._controller?.clearConflictLog()}>清除日志</button>
      `;

    return this._sectionWrap(
      "conflicts",
      "",
      body,
      html`<span class="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-white/5 ${hasConflicts ? "bg-amber-500/10 text-amber-500" : "text-gray-500"}">${this._conflicts.length}</span>`,
    );
  }

  static styles = unsafeCSS(`
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none; appearance: none;
      width: 14px; height: 14px; border-radius: 50%;
      background: #5eead4; cursor: pointer;
      box-shadow: 0 0 8px rgba(94,234,212,0.3);
      border: 2px solid rgba(22,22,30,0.8);
    }
    input[type="range"]::-moz-range-thumb {
      width: 14px; height: 14px; border-radius: 50%;
      background: #5eead4; cursor: pointer;
      box-shadow: 0 0 8px rgba(94,234,212,0.3);
      border: 2px solid rgba(22,22,30,0.8);
    }
    input[type="range"] { -webkit-appearance: none; appearance: none; background: transparent; }
    input[type="range"]::-webkit-slider-runnable-track { height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; }
    input[type="range"]::-moz-range-track { height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; }
  `);
}

customElements.define("live2d-dev-tools", Live2dDevTools);
