// Small accessibility helpers shared by the dialogs and panels (audit L15),
// following the JWST viewer's patterns.

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keep Tab / Shift+Tab cycling inside `container`. Call from a keydown handler. */
export function trapTab(container: HTMLElement, ev: KeyboardEvent): void {
  if (ev.key !== "Tab") { return; }
  const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
    .filter(el => el.offsetParent !== null || el === document.activeElement);
  if (items.length === 0) { ev.preventDefault(); return; }
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (active === container || !container.contains(active)) {
    ev.preventDefault();
    (ev.shiftKey ? last : first).focus();
  } else if (ev.shiftKey && active === first) {
    ev.preventDefault();
    last.focus();
  } else if (!ev.shiftKey && active === last) {
    ev.preventDefault();
    first.focus();
  }
}

/**
 * True when a key event belongs to a control that uses the arrow keys itself
 * (sliders, text fields, selects), so global shortcuts must not fire (L14).
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) { return false; }
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") { return true; }
  if (el.isContentEditable) { return true; }
  const role = el.getAttribute("role");
  return role === "slider" || role === "tab" || role === "listbox" || role === "menuitem";
}
