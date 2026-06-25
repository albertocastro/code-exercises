# React 20 — Accessible Modal

**Estimated time:** 40–55 minutes
**Goal:** Portals, ARIA, keyboard, and focus management — the building blocks of
an accessible dialog.

You edit `solution.tsx`.

## Contract
```ts
interface ModalProps { open: boolean; onClose: () => void; title: string; children: React.ReactNode; }
```
`role="dialog"` with `aria-modal` + `aria-label={title}`; a close button named
**close**; a `.modal-backdrop` wrapper. Render via a portal to `document.body`.

## Levels
1. **Open / closed** — render a labelled dialog (with content) only when `open`.
2. **Closing** — Escape, the close button, and a backdrop click all call
   `onClose`; a click inside the dialog does not.
3. **Focus management** — move focus into the dialog on open; restore focus to
   the previously-focused element on close.
