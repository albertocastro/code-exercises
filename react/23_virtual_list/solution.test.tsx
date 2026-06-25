import { render, screen, fireEvent } from "@testing-library/react";
import { VirtualList } from "./solution";

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

const ITEMS = Array.from({ length: 1000 }, (_, i) => `Item ${i}`);
const rows = () => screen.queryAllByTestId("row").map((r) => r.textContent);
const viewport = () => screen.getByTestId("viewport");
const scrollTo = (top: number) => fireEvent.scroll(viewport(), { target: { scrollTop: top } });

// height 100, itemHeight 20 => 5 visible rows.

// ── Level 1: Render the window only ─────────────────────────────────────────
level(1, "render the visible window", () => {
  test("renders only the visible rows, not all items", () => {
    render(<VirtualList items={ITEMS} itemHeight={20} height={100} />);
    expect(rows()).toHaveLength(5);
    expect(rows()).toEqual(["Item 0", "Item 1", "Item 2", "Item 3", "Item 4"]);
  });

  test("the scroll area reflects the full list height", () => {
    render(<VirtualList items={ITEMS} itemHeight={20} height={100} />);
    const spacer = viewport().firstElementChild as HTMLElement;
    expect(spacer.style.height).toBe("20000px"); // 1000 * 20
  });
});

// ── Level 2: Scroll updates the window ──────────────────────────────────────
level(2, "scroll updates the window", () => {
  test("shows later rows after scrolling", () => {
    render(<VirtualList items={ITEMS} itemHeight={20} height={100} />);
    scrollTo(200); // 200 / 20 = 10
    expect(rows()).toEqual(["Item 10", "Item 11", "Item 12", "Item 13", "Item 14"]);
  });
});

// ── Level 3: Overscan ───────────────────────────────────────────────────────
level(3, "overscan", () => {
  test("renders buffer rows above and below", () => {
    render(<VirtualList items={ITEMS} itemHeight={20} height={100} overscan={2} />);
    scrollTo(200); // start index 10, minus overscan 2 => 8
    const r = rows();
    expect(r[0]).toBe("Item 8");
    expect(r.length).toBe(9); // 5 visible + 2*2 overscan
  });
});
