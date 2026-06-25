import { render, screen, fireEvent, within } from "@testing-library/react";
import { DataTable, type Column } from "./solution";

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

const COLUMNS: Column[] = [
  { key: "name", label: "Name", sortable: true },
  { key: "age", label: "Age", sortable: true },
  { key: "city", label: "City" },
];
const ROWS = [
  { name: "Charlie", age: 30, city: "NYC" },
  { name: "Alice", age: 25, city: "LA" },
  { name: "Bob", age: 35, city: "SF" },
];

const bodyRows = () => {
  const all = screen.getAllByRole("row");
  return all.slice(1); // drop header row
};
const firstCellTexts = () => bodyRows().map((r) => within(r).getAllByRole("cell")[0].textContent);

// ── Level 1: Render ─────────────────────────────────────────────────────────
level(1, "render columns and rows", () => {
  test("renders a header per column", () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} />);
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["Name", "Age", "City"]);
  });

  test("renders every data row", () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} />);
    expect(bodyRows()).toHaveLength(3);
  });

  test("renders cell values", () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} />);
    expect(screen.getByText("Charlie")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("SF")).toBeInTheDocument();
  });
});

// ── Level 2: Sorting ────────────────────────────────────────────────────────
level(2, "sortable columns", () => {
  test("clicking a sortable header sorts ascending", () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} />);
    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(firstCellTexts()).toEqual(["Alice", "Bob", "Charlie"]);
  });

  test("clicking again sorts descending", () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} />);
    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(firstCellTexts()).toEqual(["Charlie", "Bob", "Alice"]);
  });

  test("sorts by the chosen column", () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} />);
    fireEvent.click(screen.getByRole("button", { name: "Age" }));
    expect(firstCellTexts()).toEqual(["Alice", "Charlie", "Bob"]); // by age 25,30,35
  });

  test("active column exposes aria-sort", () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} />);
    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    const nameHeader = screen.getByRole("columnheader", { name: /Name/ });
    expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
  });

  test("non-sortable columns have no sort button", () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} />);
    expect(screen.queryByRole("button", { name: "City" })).toBeNull();
  });
});

// ── Level 3: Pagination ─────────────────────────────────────────────────────
level(3, "pagination", () => {
  test("shows only pageSize rows", () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} pageSize={2} />);
    expect(bodyRows()).toHaveLength(2);
  });

  test("page info reflects the current page", () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} pageSize={2} />);
    expect(screen.getByTestId("page-info")).toHaveTextContent("1 of 2");
  });

  test("previous is disabled on the first page", () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} pageSize={2} />);
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
  });

  test("next advances the page", () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} pageSize={2} />);
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(bodyRows()).toHaveLength(1);
    expect(screen.getByTestId("page-info")).toHaveTextContent("2 of 2");
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  test("previous goes back", () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} pageSize={2} />);
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("button", { name: /previous/i }));
    expect(screen.getByTestId("page-info")).toHaveTextContent("1 of 2");
  });
});

// ── Level 4: Selection ──────────────────────────────────────────────────────
level(4, "row selection", () => {
  test("renders a checkbox per row plus select-all", () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} selectable />);
    expect(screen.getAllByRole("checkbox")).toHaveLength(4);
  });

  test("selecting a row reports it", () => {
    const onSel = vi.fn();
    render(<DataTable columns={COLUMNS} rows={ROWS} selectable onSelectionChange={onSel} />);
    fireEvent.click(screen.getByLabelText("select Alice"));
    expect(onSel).toHaveBeenLastCalledWith([ROWS[1]]);
  });

  test("select-all selects every row", () => {
    const onSel = vi.fn();
    render(<DataTable columns={COLUMNS} rows={ROWS} selectable onSelectionChange={onSel} />);
    fireEvent.click(screen.getByLabelText("select all"));
    expect(onSel).toHaveBeenLastCalledWith(ROWS);
    screen.getAllByRole("checkbox").forEach((c) => expect(c).toBeChecked());
  });

  test("select-all toggles off", () => {
    const onSel = vi.fn();
    render(<DataTable columns={COLUMNS} rows={ROWS} selectable onSelectionChange={onSel} />);
    fireEvent.click(screen.getByLabelText("select all"));
    fireEvent.click(screen.getByLabelText("select all"));
    expect(onSel).toHaveBeenLastCalledWith([]);
  });
});
