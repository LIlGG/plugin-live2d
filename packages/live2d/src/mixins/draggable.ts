import {
  clearPosition,
  getSavedPosition,
  savePosition,
} from "@/live2d/utils/drag-position";

export interface DraggableOptions {
  storageKey: string;
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

// biome-ignore lint/suspicious/noExplicitAny: mixin pattern requires any for constructor signature
export type Constructor<T = {}> = new (...args: any[]) => T;

// biome-ignore lint/suspicious/noExplicitAny: mixin pattern requires any for constructor signature
type HTMLElementConstructor = new (...args: any[]) => HTMLElement;

// Return type that includes the mixin interface
type DraggableMixinReturn<T extends HTMLElementConstructor> = T & Constructor<DraggableInterface>;

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
    private _dragThreshold = 3;
    private _overlay?: HTMLDivElement;

    // biome-ignore lint/suspicious/noExplicitAny: mixin pattern requires any for constructor rest args
    constructor(...args: any[]) {
      super(...args);
    }

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
      if (!saved) {
        return;
      }
      const style = this.style;
      if (saved.left !== undefined) {
        style.left = saved.left;
        style.right = "auto";
      }
      if (saved.right !== undefined) {
        style.right = saved.right;
        style.left = "auto";
      }
      if (saved.bottom !== undefined) {
        style.bottom = saved.bottom;
      }
      if (saved.top !== undefined) {
        style.top = saved.top;
      }
    }

    /**
     * 重置位置（清除保存的位置）
     */
    resetPosition(): void {
      clearPosition(options.storageKey);
      const style = this.style;
      style.left = "";
      style.right = "";
      style.bottom = "";
      style.top = "";
    }

    connectedCallback(): void {
      const proto = Object.getPrototypeOf(DraggableClass.prototype);
      if (typeof proto.connectedCallback === "function") {
        proto.connectedCallback.call(this);
      }
      this._setupDragListeners();
    }

    disconnectedCallback(): void {
      this._removeDragListeners();
      this._removeOverlay();
      const proto = Object.getPrototypeOf(DraggableClass.prototype);
      if (typeof proto.disconnectedCallback === "function") {
        proto.disconnectedCallback.call(this);
      }
    }

    private _setupDragListeners(): void {
      this.addEventListener("mousedown", this._onMouseDown);
      this.addEventListener("touchstart", this._onTouchStart, { passive: false });
    }

    private _removeDragListeners(): void {
      this.removeEventListener("mousedown", this._onMouseDown);
      this.removeEventListener("touchstart", this._onTouchStart);
      this._endDrag();
    }

    private _onMouseDown = (e: MouseEvent): void => {
      // 只响应左键，不响应输入框、按钮等交互元素上的拖拽
      if (
        e.button !== 0 ||
        this._isInteractiveElement(e.target as HTMLElement)
      ) {
        return;
      }
      this._startDrag(e.clientX, e.clientY);
      e.preventDefault();
    };

    private _onTouchStart = (e: TouchEvent): void => {
      if (
        e.touches.length !== 1 ||
        this._isInteractiveElement(e.target as HTMLElement)
      ) {
        return;
      }
      const touch = e.touches[0];
      this._startDrag(touch.clientX, touch.clientY);
    };

    private _isInteractiveElement(el: HTMLElement | null): boolean {
      if (!el) return false;
      const tagName = el.tagName.toLowerCase();
      const interactiveTags = [
        "input",
        "textarea",
        "button",
        "select",
        "a",
        "canvas",
      ];
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
      const rect = this.getBoundingClientRect();

      this._dragStartX = clientX;
      this._dragStartY = clientY;
      this._initialLeft = rect.left;
      this._initialTop = rect.top;
      this._isDragging = false;

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
      const dx = clientX - this._dragStartX;
      const dy = clientY - this._dragStartY;

      if (!this._isDragging) {
        if (
          Math.abs(dx) > this._dragThreshold ||
          Math.abs(dy) > this._dragThreshold
        ) {
          this._isDragging = true;
          this._addOverlay();
          this.classList.add(DRAGGING_CLASS);
          this.style.cursor = "grabbing";
        } else {
          return;
        }
      }

      const newLeft = this._initialLeft + dx;
      const newTop = this._initialTop + dy;

      // 确保不拖出视口
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const rect = this.getBoundingClientRect();
      const clampedLeft = Math.max(
        0,
        Math.min(newLeft, viewportWidth - rect.width),
      );
      const clampedTop = Math.max(
        0,
        Math.min(newTop, viewportHeight - rect.height),
      );

      this.style.left = `${clampedLeft}px`;
      this.style.top = `${clampedTop}px`;
      this.style.right = "auto";
      this.style.bottom = "auto";
    }

    private _onMouseUp = (): void => {
      this._endDrag();
    };

    private _onTouchEnd = (): void => {
      this._endDrag();
    };

    private _endDrag(): void {
      if (this._isDragging) {
        const rect = this.getBoundingClientRect();

        // 保存位置
        savePosition(options.storageKey, {
          left: `${rect.left}px`,
          top: `${rect.top}px`,
        });

        this.classList.remove(DRAGGING_CLASS);
        this.style.cursor = "";
      }

      document.removeEventListener("mousemove", this._onMouseMove);
      document.removeEventListener("mouseup", this._onMouseUp);
      document.removeEventListener("touchmove", this._onTouchMove);
      document.removeEventListener("touchend", this._onTouchEnd);

      this._isDragging = false;
      this._removeOverlay();
    }

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
      if (this._overlay && this._overlay.parentNode) {
        this._overlay.parentNode.removeChild(this._overlay);
        this._overlay = undefined;
      }
    }
  }

  return DraggableClass as DraggableMixinReturn<T>;
};
