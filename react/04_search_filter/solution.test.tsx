import { render, screen, fireEvent } from "@testing-library/react";
import { SearchList } from "./solution";

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

const ITEMS = ["Apple", "Banana", "Cherry", "Date", "Avocado"];
const box = () => screen.getByLabelText(/search/i);
const options = () => screen.queryAllByRole("option");
const search = (v: string) => fireEvent.change(box(), { target: { value: v } });
const selected = () =>
  options().find((o) => o.getAttribute("aria-selected") === "true");
const key = (k: string) => fireEvent.keyDown(box(), { key: k });

// ── Level 1: Filter ─────────────────────────────────────────────────────────
level(1, "filter by query", () => {
  test("renders all items initially", () => {
    render(<SearchList items={ITEMS} />);
    expect(options()).toHaveLength(5);
  });

  test("filters by case-insensitive substring", () => {
    render(<SearchList items={ITEMS} />);
    search("av");
    expect(options().map((o) => o.textContent)).toEqual(["Avocado"]);
  });

  test("matching is case-insensitive both ways", () => {
    render(<SearchList items={ITEMS} />);
    search("BAN");
    expect(options().map((o) => o.textContent)).toEqual(["Banana"]);
  });

  test("clearing the query restores all items", () => {
    render(<SearchList items={ITEMS} />);
    search("av");
    search("");
    expect(options()).toHaveLength(5);
  });
});

// ── Level 2: Empty state + count ────────────────────────────────────────────
level(2, "empty state and count", () => {
  test("shows a 'No results' message when nothing matches", () => {
    render(<SearchList items={ITEMS} />);
    search("xyz");
    expect(options()).toHaveLength(0);
    expect(screen.getByText(/no results/i)).toBeInTheDocument();
  });

  test("result count reflects the number of matches", () => {
    render(<SearchList items={ITEMS} />);
    expect(screen.getByTestId("result-count")).toHaveTextContent("5");
    search("a");
    expect(screen.getByTestId("result-count")).toHaveTextContent("4");
  });
});

// ── Level 3: Keyboard navigation ────────────────────────────────────────────
level(3, "keyboard navigation", () => {
  test("ArrowDown highlights the first option", () => {
    render(<SearchList items={ITEMS} />);
    key("ArrowDown");
    expect(selected()?.textContent).toBe("Apple");
  });

  test("ArrowDown moves down the list", () => {
    render(<SearchList items={ITEMS} />);
    key("ArrowDown");
    key("ArrowDown");
    expect(selected()?.textContent).toBe("Banana");
  });

  test("ArrowUp from nothing wraps to the last option", () => {
    render(<SearchList items={ITEMS} />);
    key("ArrowUp");
    expect(selected()?.textContent).toBe("Avocado");
  });

  test("Enter selects the highlighted option", () => {
    const onSelect = vi.fn();
    render(<SearchList items={ITEMS} onSelect={onSelect} />);
    key("ArrowDown");
    key("ArrowDown");
    key("Enter");
    expect(onSelect).toHaveBeenCalledWith("Banana");
  });

  test("Enter with nothing highlighted does nothing", () => {
    const onSelect = vi.fn();
    render(<SearchList items={ITEMS} onSelect={onSelect} />);
    key("Enter");
    expect(onSelect).not.toHaveBeenCalled();
  });

  test("changing the query resets the highlight", () => {
    render(<SearchList items={ITEMS} />);
    key("ArrowDown");
    search("a");
    expect(selected()).toBeUndefined();
  });
});
