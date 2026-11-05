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
