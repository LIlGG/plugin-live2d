import style from "@/live2d/styles/unocss.global.css?inline";
import { type LitElement, unsafeCSS, type CSSResult } from "lit";

declare global {
  // biome-ignore lint/suspicious/noExplicitAny: mixin constructors require any[] rest parameter per TS2545
  export type LitMixin<T = unknown> = new (...args: any[]) => T & LitElement;
}

const stylesheet = unsafeCSS(style);

export const UNO = <T extends LitMixin>(superClass: T): T =>
  class extends superClass {
    connectedCallback() {
      super.connectedCallback();
      if (this.shadowRoot) {
        const existing = this.shadowRoot.adoptedStyleSheets ?? [];
        const sheet = (stylesheet as CSSResult).styleSheet;
        if (sheet && !existing.includes(sheet)) {
          this.shadowRoot.adoptedStyleSheets = [...existing, sheet];
        }
      }
    }
  };
