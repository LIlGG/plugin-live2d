import { adoptStyles, type LitElement, unsafeCSS } from 'lit'
// @ts-ignore
import style from "../styles/unocss.global.css?inline"

declare global {
  // biome-ignore lint/suspicious/noExplicitAny: any is needed to define a mixin
  export type LitMixin<T = unknown> = new (...args: any[]) => T & LitElement;
}

const stylesheet = unsafeCSS(style)

export const UNO = <T extends LitMixin>(superClass: T): T =>
  class extends superClass {
    connectedCallback() {
      super.connectedCallback();
      if (this.shadowRoot) {
        adoptStyles(this.shadowRoot, [stylesheet])
      }
    }
  };