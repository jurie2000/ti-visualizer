import "@testing-library/jest-dom/vitest";

// jsdom kennt showModal/close von <dialog> nicht, daher ein einfacher Ersatz
// (setzt `open` und fokussiert wie der Browser das erste bedienbare Element).
function showModal(this: HTMLDialogElement) {
  this.setAttribute("open", "");
  this.querySelector<HTMLElement>(
    "button, a[href], input, [tabindex]",
  )?.focus();
}
function close(this: HTMLDialogElement) {
  if (!this.hasAttribute("open")) return;
  this.removeAttribute("open");
  this.dispatchEvent(new Event("close"));
}
Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
  configurable: true,
  value: showModal,
});
Object.defineProperty(HTMLDialogElement.prototype, "close", {
  configurable: true,
  value: close,
});

// React Flow braucht Größen, die jsdom nicht misst (Vorgehen laut React-Flow-Doku
// „Testing“): ResizeObserver meldet nach dem Beobachten, Maße kommen aus `style`.
class ResizeObserverStub {
  constructor(private callback: ResizeObserverCallback) {}
  observe(target: Element) {
    // Asynchron wie im Browser: React Flow kennt seinen Wurzelknoten erst nach dem Einhängen.
    setTimeout(() => {
      this.callback([{ target } as ResizeObserverEntry], this);
    }, 0);
  }
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub;
globalThis.DOMMatrixReadOnly = class {
  m22 = 1;
} as unknown as typeof DOMMatrixReadOnly;
Object.defineProperties(HTMLElement.prototype, {
  offsetWidth: {
    configurable: true,
    get() {
      return parseFloat((this as HTMLElement).style.width) || 1;
    },
  },
  offsetHeight: {
    configurable: true,
    get() {
      return parseFloat((this as HTMLElement).style.height) || 1;
    },
  },
});
