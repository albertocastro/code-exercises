import { render, screen, fireEvent } from "@testing-library/react";
import { FilterList, type Item } from "./solution";

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

const ITEMS: Item[] = [
  { id: 1, name: "Laptop", category: "Electronics", price: 1000 },
  { id: 2, name: "Phone", category: "Electronics", price: 500 },
  { id: 3, name: "Shirt", category: "Clothing", price: 30 },
  { id: 4, name: "Shoes", category: "Clothing", price: 60 },
  { id: 5, name: "Banana", category: "Food", price: 1 },
];

const items = () => screen.queryAllByRole("listitem");
const search = (v: string) => fireEvent.change(screen.getByLabelText("search"), { target: { value: v } });

// ── Level 1: Text search ────────────────────────────────────────────────────
level(1, "text search", () => {
  test("renders all items initially", () => {
    render(<FilterList items={ITEMS} />);
    expect(items()).toHaveLength(5);
  });

  test("filters by case-insensitive name substring", () => {
    render(<FilterList items={ITEMS} />);
    search("sh");
    expect(items().map((i) => i.textContent)).toEqual(["Shirt", "Shoes"]);
  });

  test("clearing the query restores all", () => {
    render(<FilterList items={ITEMS} />);
    search("sh");
    search("");
    expect(items()).toHaveLength(5);
  });
});

// ── Level 2: Category facets ────────────────────────────────────────────────
level(2, "category facets", () => {
  test("selecting a category filters to it", () => {
    render(<FilterList items={ITEMS} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Electronics" }));
    expect(items().map((i) => i.textContent)).toEqual(["Laptop", "Phone"]);
  });

  test("multiple categories are OR-ed", () => {
    render(<FilterList items={ITEMS} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Electronics" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Clothing" }));
    expect(items()).toHaveLength(4);
  });

  test("search and category combine (AND)", () => {
    render(<FilterList items={ITEMS} />);
    search("sh");
    fireEvent.click(screen.getByRole("checkbox", { name: "Clothing" }));
    expect(items()).toHaveLength(2);
    fireEvent.click(screen.getByRole("checkbox", { name: "Electronics" }));
    // "sh" still applies; electronics adds nothing matching "sh"
    expect(items()).toHaveLength(2);
  });
});

// ── Level 3: Count + clear ──────────────────────────────────────────────────
level(3, "result count and clear all", () => {
  test("count reflects the visible items", () => {
    render(<FilterList items={ITEMS} />);
    expect(screen.getByTestId("count")).toHaveTextContent("5");
    search("sh");
    expect(screen.getByTestId("count")).toHaveTextContent("2");
  });

  test("clear all resets search and facets", () => {
    render(<FilterList items={ITEMS} />);
    search("sh");
    fireEvent.click(screen.getByRole("checkbox", { name: "Clothing" }));
    fireEvent.click(screen.getByRole("button", { name: /clear all/i }));
    expect(items()).toHaveLength(5);
    expect((screen.getByLabelText("search") as HTMLInputElement).value).toBe("");
  });
});

// ── Level 4: Facet counts ───────────────────────────────────────────────────
level(4, "facet counts", () => {
  test("each facet shows its item count", () => {
    render(<FilterList items={ITEMS} />);
    expect(screen.getByText("Electronics (2)")).toBeInTheDocument();
    expect(screen.getByText("Clothing (2)")).toBeInTheDocument();
    expect(screen.getByText("Food (1)")).toBeInTheDocument();
  });

  test("facet counts reflect the active search", () => {
    render(<FilterList items={ITEMS} />);
    search("sh");
    expect(screen.getByText("Clothing (2)")).toBeInTheDocument();
    expect(screen.getByText("Electronics (0)")).toBeInTheDocument();
    expect(screen.getByText("Food (0)")).toBeInTheDocument();
  });
});
