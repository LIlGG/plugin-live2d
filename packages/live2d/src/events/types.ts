export abstract class Live2dEvent<T> extends CustomEvent<T> {
  constructor(type: string, detail: T, options?: EventInit) {
    super(type, { detail, ...options });
  }
}