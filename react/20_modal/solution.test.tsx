import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Modal } from "./solution";

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

// ── Level 1: Open / closed ──────────────────────────────────────────────────
level(1, "open and closed", () => {
  test("renders nothing when closed", () => {
    render(
      <Modal open={false} onClose={() => {}} title="Hi">
        body
      </Modal>
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("renders a labelled dialog with content when open", () => {
    render(
      <Modal open onClose={() => {}} title="Settings">
        <p>body text</p>
      </Modal>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "Settings");
    expect(screen.getByText("body text")).toBeInTheDocument();
  });
});

// ── Level 2: Closing ────────────────────────────────────────────────────────
level(2, "closing", () => {
  test("Escape closes", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="T">
        body
      </Modal>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  test("the close button closes", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="T">
        body
      </Modal>
    );
    fireEvent.click(screen.getByRole("button", { name: "close" }));
    expect(onClose).toHaveBeenCalled();
  });

  test("clicking the backdrop closes, but not the dialog", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="T">
        <p>body</p>
      </Modal>
    );
    fireEvent.click(screen.getByText("body"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(document.querySelector(".modal-backdrop")!);
    expect(onClose).toHaveBeenCalled();
  });
});

// ── Level 3: Focus management ───────────────────────────────────────────────
level(3, "focus management", () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Open</button>
        <Modal open={open} onClose={() => setOpen(false)} title="T">
          body
        </Modal>
      </>
    );
  }

  test("focus moves into the modal and is restored on close", () => {
    render(<Harness />);
    const openBtn = screen.getByText("Open");
    openBtn.focus();
    fireEvent.click(openBtn);
    const dialog = screen.getByRole("dialog");
    expect(dialog === document.activeElement || dialog.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.activeElement).toBe(openBtn);
  });
});
