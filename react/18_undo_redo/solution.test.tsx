import { render, screen, fireEvent } from "@testing-library/react";
import { HistoryEditor } from "./solution";

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

const input = () => screen.getByLabelText("text") as HTMLInputElement;
const type = (v: string) => fireEvent.change(input(), { target: { value: v } });
const undo = () => screen.getByRole("button", { name: "undo" });
const redo = () => screen.getByRole("button", { name: "redo" });

// ── Level 1: Controlled input ───────────────────────────────────────────────
level(1, "controlled input", () => {
  test("reflects the initial value and edits", () => {
    render(<HistoryEditor initial="hi" />);
    expect(input().value).toBe("hi");
    type("hello");
    expect(input().value).toBe("hello");
  });
});

// ── Level 2: Undo ───────────────────────────────────────────────────────────
level(2, "undo", () => {
  test("undo is disabled with no history", () => {
    render(<HistoryEditor />);
    expect(undo()).toBeDisabled();
  });

  test("undo steps back through edits", () => {
    render(<HistoryEditor />);
    type("a");
    type("ab");
    fireEvent.click(undo());
    expect(input().value).toBe("a");
    fireEvent.click(undo());
    expect(input().value).toBe("");
    expect(undo()).toBeDisabled();
  });
});

// ── Level 3: Redo ───────────────────────────────────────────────────────────
level(3, "redo", () => {
  test("redo re-applies an undone edit", () => {
    render(<HistoryEditor />);
    type("x");
    fireEvent.click(undo());
    expect(input().value).toBe("");
    expect(redo()).not.toBeDisabled();
    fireEvent.click(redo());
    expect(input().value).toBe("x");
  });

  test("a new edit after undo clears the redo stack", () => {
    render(<HistoryEditor />);
    type("x");
    fireEvent.click(undo());
    type("y");
    expect(redo()).toBeDisabled();
  });
});
