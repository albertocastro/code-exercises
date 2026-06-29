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
  // TODO Level 1: render nothing when `open` is false. When open, createPortal into
  //   document.body a <div className="modal-backdrop"> wrapping a
  //   <div className="modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
  //   that contains <h2>{title}</h2>, `children`, and a
  //   <button className="exercise-button" aria-label="close">.
  // TODO Level 2: close on Escape, the close button, and a backdrop click
  //   (but NOT a click inside the dialog).
  // TODO Level 3: move focus into the dialog when it opens, and restore focus
  //   to the previously-focused element when it closes.
  // (className hints are only for the styled preview; the tests check roles + names, not classes.)

  return null;
}
