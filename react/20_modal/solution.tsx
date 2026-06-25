import { ReactNode } from "react";
import { createPortal } from "react-dom";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * Build an accessible modal. See README.md.
 *
 * The tests rely on role="dialog" with aria-modal + aria-label={title}, a
 * close button named "close", and a ".modal-backdrop" wrapper.
 */
export function Modal({ open, onClose, title, children }: ModalProps) {
  // TODO Level 2: close on Escape, the close button, and a backdrop click
  //   (but NOT a click inside the dialog).
  // TODO Level 3: move focus into the dialog when it opens, and restore focus
  //   to the previously-focused element when it closes.

  if (!open) return null;

  return createPortal(
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <h2>{title}</h2>
        {children}
        <button className="exercise-button" aria-label="close">
          ×
        </button>
      </div>
    </div>,
    document.body
  );
}
