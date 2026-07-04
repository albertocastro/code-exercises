import { render, screen, fireEvent, within } from "@testing-library/react";
import { CallLog, Call } from "./solution";

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

const CALLS: Call[] = [
  { id: "c1", agent: "Ava", status: "completed", durationSec: 75, startedAt: 1000 },
  { id: "c2", agent: "Bri", status: "failed", durationSec: 5, startedAt: 2000 },
  { id: "c3", agent: "Cal", status: "in_progress", durationSec: 605, startedAt: 3000 },
  { id: "c4", agent: "Dee", status: "completed", durationSec: 100, startedAt: 4000 },
];

const rows = () => screen.getAllByTestId("call-row");
const agentsInOrder = () =>
  screen.getAllByTestId("call-row").map((r) => within(r).getByText(/Ava|Bri|Cal|Dee/).textContent);
const rowFor = (agent: string) =>
  screen.getByText(agent).closest('[data-testid="call-row"]') as HTMLElement;

// ── Level 1: Render the call list ───────────────────────────────────────────
level(1, "render the call list", () => {
  test("renders a row per call", () => {
    render(<CallLog calls={CALLS} />);
    expect(rows()).toHaveLength(4);
  });

  test("each row shows agent, human status label, and mm:ss duration", () => {
    render(<CallLog calls={CALLS} />);
    const ava = rowFor("Ava");
    expect(within(ava).getByText("Completed")).toBeInTheDocument();
    expect(within(ava).getByText("1:15")).toBeInTheDocument();
  });

  test("in_progress renders as 'In progress' (not the raw key)", () => {
    render(<CallLog calls={CALLS} />);
    const cal = rowFor("Cal");
    expect(within(cal).getByText("In progress")).toBeInTheDocument();
    expect(within(cal).queryByText("in_progress")).not.toBeInTheDocument();
  });

  test("duration zero-pads seconds and keeps minutes over 9", () => {
    render(<CallLog calls={CALLS} />);
    expect(within(rowFor("Bri")).getByText("0:05")).toBeInTheDocument(); // 5s
    expect(within(rowFor("Cal")).getByText("10:05")).toBeInTheDocument(); // 605s
  });

  test("empty input shows an empty state, not an empty list", () => {
    render(<CallLog calls={[]} />);
    expect(screen.queryAllByTestId("call-row")).toHaveLength(0);
    expect(screen.getByText("No calls yet")).toBeInTheDocument();
  });
});

// ── Level 2: Filter by status ───────────────────────────────────────────────
level(2, "filter by status", () => {
  test("defaults to All (every call visible, All is pressed)", () => {
    render(<CallLog calls={CALLS} />);
    expect(rows()).toHaveLength(4);
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
  });

  test("clicking Completed shows only completed calls", () => {
    render(<CallLog calls={CALLS} />);
    fireEvent.click(screen.getByRole("button", { name: "Completed" }));
    expect(rows()).toHaveLength(2);
    expect(screen.getByText("Ava")).toBeInTheDocument();
    expect(screen.getByText("Dee")).toBeInTheDocument();
    expect(screen.queryByText("Bri")).not.toBeInTheDocument();
  });

  test("clicking In progress filters on the underscore status", () => {
    render(<CallLog calls={CALLS} />);
    fireEvent.click(screen.getByRole("button", { name: "In progress" }));
    expect(rows()).toHaveLength(1);
    expect(screen.getByText("Cal")).toBeInTheDocument();
  });

  test("the active filter is the only one pressed", () => {
    render(<CallLog calls={CALLS} />);
    fireEvent.click(screen.getByRole("button", { name: "Failed" }));
    expect(screen.getByRole("button", { name: "Failed" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "false");
  });

  test("a filter that matches nothing shows the empty state", () => {
    const onlyCompleted = CALLS.filter((c) => c.status === "completed");
    render(<CallLog calls={onlyCompleted} />);
    fireEvent.click(screen.getByRole("button", { name: "Failed" }));
    expect(screen.queryAllByTestId("call-row")).toHaveLength(0);
    expect(screen.getByText("No calls yet")).toBeInTheDocument();
  });
});

// ── Level 3: Summary stats over the filtered set ────────────────────────────
level(3, "summary stats", () => {
  test("shows count, total talk time, and average for all calls", () => {
    render(<CallLog calls={CALLS} />);
    expect(screen.getByTestId("stat-count")).toHaveTextContent("4");
    expect(screen.getByTestId("stat-total")).toHaveTextContent("13:05"); // 785s
    expect(screen.getByTestId("stat-average")).toHaveTextContent("3:16"); // 196.25 -> 196
  });

  test("stats recompute over the filtered set", () => {
    render(<CallLog calls={CALLS} />);
    fireEvent.click(screen.getByRole("button", { name: "Completed" }));
    expect(screen.getByTestId("stat-count")).toHaveTextContent("2");
    expect(screen.getByTestId("stat-total")).toHaveTextContent("2:55"); // 175s
    expect(screen.getByTestId("stat-average")).toHaveTextContent("1:28"); // 87.5 -> 88
  });

  test("average rounds to the nearest second", () => {
    render(<CallLog calls={CALLS} />);
    // default (all): average is 196.25 -> 196 -> 3:16, already covered; here check a filter
    fireEvent.click(screen.getByRole("button", { name: "In progress" }));
    expect(screen.getByTestId("stat-average")).toHaveTextContent("10:05"); // single call
  });

  test("an empty filtered set reports zeros, not NaN", () => {
    const onlyCompleted = CALLS.filter((c) => c.status === "completed");
    render(<CallLog calls={onlyCompleted} />);
    fireEvent.click(screen.getByRole("button", { name: "Failed" }));
    expect(screen.getByTestId("stat-count")).toHaveTextContent("0");
    expect(screen.getByTestId("stat-total")).toHaveTextContent("0:00");
    expect(screen.getByTestId("stat-average")).toHaveTextContent("0:00");
  });
});

// ── Level 4: Sort by duration ───────────────────────────────────────────────
level(4, "sort by duration", () => {
  test("input order is preserved until a sort is chosen", () => {
    render(<CallLog calls={CALLS} />);
    expect(agentsInOrder()).toEqual(["Ava", "Bri", "Cal", "Dee"]);
  });

  test("first click sorts by duration descending", () => {
    render(<CallLog calls={CALLS} />);
    fireEvent.click(screen.getByRole("button", { name: /sort by duration/i }));
    expect(agentsInOrder()).toEqual(["Cal", "Dee", "Ava", "Bri"]); // 605,100,75,5
  });

  test("clicking again flips to ascending", () => {
    render(<CallLog calls={CALLS} />);
    const sortBtn = screen.getByRole("button", { name: /sort by duration/i });
    fireEvent.click(sortBtn);
    fireEvent.click(sortBtn);
    expect(agentsInOrder()).toEqual(["Bri", "Ava", "Dee", "Cal"]); // 5,75,100,605
  });

  test("sort applies within the active filter only", () => {
    render(<CallLog calls={CALLS} />);
    fireEvent.click(screen.getByRole("button", { name: "Completed" }));
    fireEvent.click(screen.getByRole("button", { name: /sort by duration/i }));
    expect(agentsInOrder()).toEqual(["Dee", "Ava"]); // 100 then 75
  });

  test("sorting does not change the stats", () => {
    render(<CallLog calls={CALLS} />);
    fireEvent.click(screen.getByRole("button", { name: /sort by duration/i }));
    expect(screen.getByTestId("stat-count")).toHaveTextContent("4");
    expect(screen.getByTestId("stat-total")).toHaveTextContent("13:05");
  });
});
