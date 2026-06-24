import { render, screen, fireEvent } from "@testing-library/react";
import { Tabs, TabItem } from "./solution";

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

const TABS: TabItem[] = [
  { label: "One", content: <p>First panel</p> },
  { label: "Two", content: <p>Second panel</p> },
  { label: "Three", content: <p>Third panel</p> },
];

// ── Level 1: Switch panels ──────────────────────────────────────────────────
// (role-agnostic: ARIA roles are introduced in Level 2)
level(1, "switch panels", () => {
  test("renders a trigger per tab", () => {
    render(<Tabs tabs={TABS} />);
    ["One", "Two", "Three"].forEach((l) =>
      expect(screen.getByText(l)).toBeInTheDocument()
    );
  });

  test("shows the first panel by default", () => {
    render(<Tabs tabs={TABS} />);
    expect(screen.getByText("First panel")).toBeInTheDocument();
    expect(screen.queryByText("Second panel")).not.toBeInTheDocument();
  });

  test("`defaultIndex` chooses the initial panel", () => {
    render(<Tabs tabs={TABS} defaultIndex={1} />);
    expect(screen.getByText("Second panel")).toBeInTheDocument();
    expect(screen.queryByText("First panel")).not.toBeInTheDocument();
  });

  test("clicking a tab shows its panel and hides the others", () => {
    render(<Tabs tabs={TABS} />);
    fireEvent.click(screen.getByText("Three"));
    expect(screen.getByText("Third panel")).toBeInTheDocument();
    expect(screen.queryByText("First panel")).not.toBeInTheDocument();
  });
});

// ── Level 2: ARIA roles ─────────────────────────────────────────────────────
level(2, "ARIA roles", () => {
  test("triggers expose role=tab", () => {
    render(<Tabs tabs={TABS} />);
    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });

  test("the active tab is aria-selected, the rest are not", () => {
    render(<Tabs tabs={TABS} defaultIndex={1} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    expect(tabs[0]).toHaveAttribute("aria-selected", "false");
    expect(tabs[2]).toHaveAttribute("aria-selected", "false");
  });

  test("exactly one tabpanel renders, showing the active content", () => {
    render(<Tabs tabs={TABS} />);
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("First panel");
  });

  test("selecting a tab updates aria-selected and the panel", () => {
    render(<Tabs tabs={TABS} />);
    fireEvent.click(screen.getByRole("tab", { name: "Two" }));
    expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Second panel");
  });
});

// ── Level 3: Keyboard navigation ────────────────────────────────────────────
level(3, "keyboard navigation", () => {
  const arrow = (key: string) =>
    fireEvent.keyDown(screen.getByRole("tablist"), { key });
  const activeLabel = () =>
    screen.getAllByRole("tab").find((t) => t.getAttribute("aria-selected") === "true")
      ?.textContent;

  test("ArrowRight moves to the next tab", () => {
    render(<Tabs tabs={TABS} />);
    arrow("ArrowRight");
    expect(activeLabel()).toBe("Two");
  });

  test("ArrowRight wraps from last to first", () => {
    render(<Tabs tabs={TABS} defaultIndex={2} />);
    arrow("ArrowRight");
    expect(activeLabel()).toBe("One");
  });

  test("ArrowLeft wraps from first to last", () => {
    render(<Tabs tabs={TABS} />);
    arrow("ArrowLeft");
    expect(activeLabel()).toBe("Three");
  });

  test("Home and End jump to the ends", () => {
    render(<Tabs tabs={TABS} defaultIndex={1} />);
    arrow("End");
    expect(activeLabel()).toBe("Three");
    arrow("Home");
    expect(activeLabel()).toBe("One");
  });
});
