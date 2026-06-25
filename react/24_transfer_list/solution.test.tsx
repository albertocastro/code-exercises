import { render, screen, fireEvent, within } from "@testing-library/react";
import { TransferList } from "./solution";

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

const left = () => screen.getByTestId("left");
const right = () => screen.getByTestId("right");
const inLeft = (name: string) => within(left()).queryByRole("button", { name });
const inRight = (name: string) => within(right()).queryByRole("button", { name });
const pick = (within_: HTMLElement, name: string) =>
  fireEvent.click(within(within_).getByRole("button", { name }));
const ctrl = (name: string) => fireEvent.click(screen.getByRole("button", { name }));

// ── Level 1: Render + select ────────────────────────────────────────────────
level(1, "render and select", () => {
  test("renders items in each list", () => {
    render(<TransferList initialLeft={["A", "B"]} initialRight={["C"]} />);
    expect(inLeft("A")).toBeInTheDocument();
    expect(inRight("C")).toBeInTheDocument();
  });

  test("clicking an item toggles its selection", () => {
    render(<TransferList initialLeft={["A", "B"]} />);
    const a = within(left()).getByRole("button", { name: "A" });
    fireEvent.click(a);
    expect(a).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(a);
    expect(a).toHaveAttribute("aria-pressed", "false");
  });
});

// ── Level 2: Move selected ──────────────────────────────────────────────────
level(2, "move selected", () => {
  test("move right transfers the selected items", () => {
    render(<TransferList initialLeft={["A", "B"]} />);
    pick(left(), "A");
    ctrl("move right");
    expect(inRight("A")).toBeInTheDocument();
    expect(inLeft("A")).toBeNull();
  });

  test("move left transfers back", () => {
    render(<TransferList initialLeft={[]} initialRight={["C"]} />);
    pick(right(), "C");
    ctrl("move left");
    expect(inLeft("C")).toBeInTheDocument();
    expect(inRight("C")).toBeNull();
  });
});

// ── Level 3: Move all ───────────────────────────────────────────────────────
level(3, "move all", () => {
  test("move all right empties the left list", () => {
    render(<TransferList initialLeft={["A", "B", "C"]} />);
    ctrl("move all right");
    expect(within(left()).queryAllByRole("button")).toHaveLength(0);
    expect(within(right()).queryAllByRole("button")).toHaveLength(3);
  });

  test("move all left empties the right list", () => {
    render(<TransferList initialLeft={[]} initialRight={["X", "Y"]} />);
    ctrl("move all left");
    expect(within(right()).queryAllByRole("button")).toHaveLength(0);
    expect(within(left()).queryAllByRole("button")).toHaveLength(2);
  });
});
