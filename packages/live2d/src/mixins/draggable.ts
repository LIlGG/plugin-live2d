import {
  clearPosition,
  getSavedPosition,
  savePosition,
} from "@/live2d/utils/drag-position";
import type { PropertyValues } from "lit";

export interface DraggableOptions {
  storageKey: string;
  targetSelector?: string;
  clearTransformOnPosition?: boolean;
}

export interface Position {
  left?: string;
  right?: string;
  bottom?: string;
  top?: string;
}

export interface DraggableInterface {
  getSavedPosition(): Position | null;
  applySavedPosition(): void;
  resetPosition(): void;
}

const DRAGGING_CLASS = "live2d-dragging";
const DRAG_OVERLAY_ID = "live2d-drag-overlay";
const POSITION_UNIT_PATTERN = /^-?\d+(\.\d+)?px$/;

// TypeScript requires `any[]` for generic class mixin constructors.
// biome-ignore lint/suspicious/noExplicitAny: required by TS mixin constructor rules
type Constructor<T = object> = new (...args: any[]) => T;

type HTMLElementConstructor = Constructor<HTMLElement>;

type HTMLElementLifecycle = HTMLElement & {
  connectedCallback?(): void;
  disconnectedCallback?(): void;
  firstUpdated?(changedProperties: PropertyValues): void;
  updated?(changedProperties: PropertyValues): void;
};

// Return type that includes the mixin interface
type DraggableMixinReturn<T extends HTMLElementConstructor> = T &
  Constructor<DraggableInterface>;

/**
 * 为 HTMLElement 添加拖拽调整位置的功能
 * 位置信息保存在 localStorage 中
 *
 * 使用方式：
 * class MyElement extends DraggableMixin(LitElement, { storageKey: "my-element" }) {
 *   // ...
 * }
 */
export const DraggableMixin = <T extends HTMLElementConstructor>(
  SuperClass: T,
  options: DraggableOptions,
): DraggableMixinReturn<T> => {
  class DraggableClass extends SuperClass implements DraggableInterface {
    private _dragStartX = 0;
    private _dragStartY = 0;
    private _initialLeft = 0;
    private _initialTop = 0;
    private _isDragging = false;
    private readonly _dragThreshold = 3;
    private _dragElement?: HTMLElement;
    private _activeDragElement?: HTMLElement;
    private _overlay?: HTMLDivElement;
    private _suppressNextClick = false;

    /**
     * 获取保存的位置
     */
    getSavedPosition(): Position | null {
      return getSavedPosition(options.storageKey);
    }

    /**
     * 应用保存的位置到元素
     */
    applySavedPosition(): void {
      const saved = this.getSavedPosition();
      const dragElement = this._getDragElement();
      if (!saved || !dragElement) {
        return;
      }
      const nextPosition = this._getClampedSavedPosition(saved, dragElement);
      if (!nextPosition) {
        clearPosition(options.storageKey);
        return;
      }
      const style = dragElement.style;
      if (nextPosition.left !== undefined) {
        style.left = nextPosition.left;
        style.right = "auto";
      }
      if (nextPosition.right !== undefined) {
        style.right = nextPosition.right;
        style.left = "auto";
      }
      if (nextPosition.bottom !== undefined) {
        style.bottom = nextPosition.bottom;
      }
      if (nextPosition.top !== undefined) {
        style.top = nextPosition.top;
        style.bottom = "auto";
      }
      if (options.clearTransformOnPosition) {
        style.transform = "none";
      }
    }

    /**
     * 重置位置（清除保存的位置）
     */
    resetPosition(): void {
      clearPosition(options.storageKey);
      const dragElement = this._getDragElement();
      if (!dragElement) {
        return;
      }
      const style = dragElement.style;
      style.left = "";
      style.right = "";
      style.bottom = "";
      style.top = "";
      if (options.clearTransformOnPosition) {
        style.transform = "";
      }
    }

    connectedCallback(): void {
      const proto = this._getSuperPrototype();
      if (typeof proto.connectedCallback === "function") {
        proto.connectedCallback.call(this);
      }
      this._setupDragListeners();
    }

    disconnectedCallback(): void {
      this._removeDragListeners();
      this._removeOverlay();
      const proto = this._getSuperPrototype();
      if (typeof proto.disconnectedCallback === "function") {
        proto.disconnectedCallback.call(this);
      }
    }

    protected firstUpdated(changedProperties: PropertyValues): void {
      const proto = this._getSuperPrototype();
      if (typeof proto.firstUpdated === "function") {
        proto.firstUpdated.call(this, changedProperties);
      }
      this._setupDragListeners();
      this.applySavedPosition();
    }

    protected updated(changedProperties: PropertyValues): void {
      const proto = this._getSuperPrototype();
      if (typeof proto.updated === "function") {
        proto.updated.call(this, changedProperties);
      }
      this._setupDragListeners();
      if (!this._isDragging) {
        this.applySavedPosition();
      }
    }

    private _getSuperPrototype(): HTMLElementLifecycle {
      return Object.getPrototypeOf(
        DraggableClass.prototype,
      ) as HTMLElementLifecycle;
    }

    private _getDragElement(): HTMLElement | null {
      if (!options.targetSelector) {
        return this;
      }
      return (
        this.shadowRoot?.querySelector<HTMLElement>(options.targetSelector) ??
        null
      );
    }

    private _getClampedSavedPosition(
      saved: Position,
      dragElement: HTMLElement,
    ): Position | null {
      if (
        !this._isPixelPosition(saved.left) ||
        !this._isPixelPosition(saved.top)
      ) {
        return null;
      }

      const rect = dragElement.getBoundingClientRect();
      const left = this._clampToViewport(
        Number.parseFloat(saved.left),
        rect.width,
        window.innerWidth,
      );
      const top = this._clampToViewport(
        Number.parseFloat(saved.top),
        rect.height,
        window.innerHeight,
      );

      return {
        left: `${left}px`,
        top: `${top}px`,
      };
    }

    private _isPixelPosition(value: string | undefined): value is string {
      return value !== undefined && POSITION_UNIT_PATTERN.test(value);
    }

    private _clampToViewport(
      position: number,
      elementSize: number,
      viewportSize: number,
    ): number {
      return Math.max(
        0,
        Math.min(position, Math.max(0, viewportSize - elementSize)),
      );
    }

    private _setupDragListeners(): void {
      const dragElement = this._getDragElement();
      if (!dragElement || dragElement === this._dragElement) {
        return;
      }
      this._removeDragListeners();
      this._dragElement = dragElement;
      dragElement.addEventListener("mousedown", this._onMouseDown);
      dragElement.addEventListener("touchstart", this._onTouchStart, {
        passive: false,
      });
      dragElement.addEventListener("click", this._onClickCapture, true);
    }

    private _removeDragListeners(): void {
      this._dragElement?.removeEventListener("mousedown", this._onMouseDown);
      this._dragElement?.removeEventListener("touchstart", this._onTouchStart);
      this._dragElement?.removeEventListener(
        "click",
        this._onClickCapture,
        true,
      );
      this._dragElement = undefined;
      this._endDrag();
    }

    private _onMouseDown = (e: MouseEvent): void => {
      // 只响应左键，不响应输入框、按钮等交互元素上的拖拽
      if (e.button !== 0 || this._isInteractiveEvent(e)) {
        return;
      }
      this._startDrag(e.clientX, e.clientY);
      e.preventDefault();
    };

    private _onTouchStart = (e: TouchEvent): void => {
      if (e.touches.length !== 1 || this._isInteractiveEvent(e)) {
        return;
      }
      const touch = e.touches[0];
      this._startDrag(touch.clientX, touch.clientY);
    };

    private _isInteractiveEvent(e: Event): boolean {
      for (const target of e.composedPath()) {
        if (target === this._dragElement || target === this) {
          break;
        }
        if (
          target instanceof HTMLElement &&
          this._isInteractiveElement(target)
        ) {
          return true;
        }
      }
      return false;
    }

    private _isInteractiveElement(el: HTMLElement): boolean {
      const tagName = el.tagName.toLowerCase();
      const interactiveTags = ["input", "textarea", "button", "select", "a"];
      if (interactiveTags.includes(tagName)) {
        return true;
      }
      // 检查是否在工具栏内部
      if (
        el.closest("#live2d-tools") ||
        el.closest("#live2d-chat-input") ||
        el.closest("#live2d-chat-send")
      ) {
        return true;
      }
      return false;
    }

    private _startDrag(clientX: number, clientY: number): void {
      const dragElement = this._getDragElement();
      if (!dragElement) {
        return;
      }
      const rect = dragElement.getBoundingClientRect();

      this._dragStartX = clientX;
      this._dragStartY = clientY;
      this._initialLeft = rect.left;
      this._initialTop = rect.top;
      this._isDragging = false;
      this._activeDragElement = dragElement;

      document.addEventListener("mousemove", this._onMouseMove);
      document.addEventListener("mouseup", this._onMouseUp);
      document.addEventListener("touchmove", this._onTouchMove, {
        passive: false,
      });
      document.addEventListener("touchend", this._onTouchEnd);
    }

    private _onMouseMove = (e: MouseEvent): void => {
      this._handleMove(e.clientX, e.clientY);
    };

    private _onTouchMove = (e: TouchEvent): void => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      this._handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    private _handleMove(clientX: number, clientY: number): void {
      const dragElement = this._activeDragElement ?? this._getDragElement();
      if (!dragElement) {
        return;
      }
      const dx = clientX - this._dragStartX;
      const dy = clientY - this._dragStartY;

      if (!this._isDragging) {
        if (
          Math.abs(dx) > this._dragThreshold ||
          Math.abs(dy) > this._dragThreshold
        ) {
          this._isDragging = true;
          this._addOverlay();
          dragElement.classList.add(DRAGGING_CLASS);
          dragElement.style.cursor = "grabbing";
        } else {
          return;
        }
      }

      const newLeft = this._initialLeft + dx;
      const newTop = this._initialTop + dy;

      // 确保不拖出视口
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const rect = dragElement.getBoundingClientRect();
      const clampedLeft = Math.max(
        0,
        Math.min(newLeft, viewportWidth - rect.width),
      );
      const clampedTop = Math.max(
        0,
        Math.min(newTop, viewportHeight - rect.height),
      );

      dragElement.style.left = `${clampedLeft}px`;
      dragElement.style.top = `${clampedTop}px`;
      dragElement.style.right = "auto";
      dragElement.style.bottom = "auto";
      if (options.clearTransformOnPosition) {
        dragElement.style.transform = "none";
      }
    }

    private _onMouseUp = (): void => {
      this._endDrag();
    };

    private _onTouchEnd = (): void => {
      this._endDrag();
    };

    private _endDrag(): void {
      const dragElement = this._activeDragElement ?? this._getDragElement();
      if (this._isDragging) {
        const rect = dragElement?.getBoundingClientRect();
        if (rect && dragElement) {
          // 保存位置
          savePosition(options.storageKey, {
            left: `${rect.left}px`,
            top: `${rect.top}px`,
          });

          dragElement.classList.remove(DRAGGING_CLASS);
          dragElement.style.cursor = "";
          this._suppressNextClick = true;
          window.setTimeout(() => {
            this._suppressNextClick = false;
          }, 0);
        }
      }

      document.removeEventListener("mousemove", this._onMouseMove);
      document.removeEventListener("mouseup", this._onMouseUp);
      document.removeEventListener("touchmove", this._onTouchMove);
      document.removeEventListener("touchend", this._onTouchEnd);

      this._isDragging = false;
      this._activeDragElement = undefined;
      this._removeOverlay();
    }

    private _onClickCapture = (e: MouseEvent): void => {
      if (!this._suppressNextClick) {
        return;
      }
      e.preventDefault();
      e.stopImmediatePropagation();
      this._suppressNextClick = false;
    };

    /**
     * 添加一个全屏 overlay 来捕获鼠标事件，避免拖拽过程中触发其他元素
     */
    private _addOverlay(): void {
      if (this._overlay) return;
      this._overlay = document.createElement("div");
      this._overlay.id = DRAG_OVERLAY_ID;
      this._overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 99999;
        cursor: grabbing;
        background: transparent;
      `;
      document.body.appendChild(this._overlay);
    }

    private _removeOverlay(): void {
      if (this._overlay?.parentNode) {
        this._overlay.parentNode.removeChild(this._overlay);
        this._overlay = undefined;
      }
    }
  }

  return DraggableClass as DraggableMixinReturn<T>;
};
