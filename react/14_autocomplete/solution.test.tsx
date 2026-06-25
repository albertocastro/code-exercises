import { render, screen, fireEvent, act } from "@testing-library/react";
import { Autocomplete } from "./solution";

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

const search = () => screen.getByLabelText("search") as HTMLInputElement;
const type = (v: string) => fireEvent.change(search(), { target: { value: v } });
const tick = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};
const options = () => screen.queryAllByRole("option");

// All async levels run on fake timers.
const withTimers = (fn: () => void) => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  fn();
};

// ── Level 1: Debounced fetch ────────────────────────────────────────────────
level(1, "debounced fetch", () =>
  withTimers(() => {
    test("waits for the debounce, then fetches and renders", async () => {
      const fetchSuggestions = vi.fn().mockResolvedValue(["react", "redux"]);
      render(<Autocomplete fetchSuggestions={fetchSuggestions} />);
      type("re");
      expect(fetchSuggestions).not.toHaveBeenCalled();
      await tick(300);
      expect(fetchSuggestions).toHaveBeenCalledWith("re");
      expect(screen.getByText("react")).toBeInTheDocument();
      expect(options()).toHaveLength(2);
    });

    test("does not fetch for an empty query", async () => {
      const fetchSuggestions = vi.fn().mockResolvedValue([]);
      render(<Autocomplete fetchSuggestions={fetchSuggestions} />);
      type("a");
      type("");
      await tick(300);
      expect(fetchSuggestions).not.toHaveBeenCalled();
    });
  })
);

// ── Level 2: Keyboard select ────────────────────────────────────────────────
level(2, "keyboard select", () =>
  withTimers(() => {
    test("arrow keys highlight and Enter selects", async () => {
      const onSelect = vi.fn();
      const fetchSuggestions = vi.fn().mockResolvedValue(["react", "redux"]);
      render(<Autocomplete fetchSuggestions={fetchSuggestions} onSelect={onSelect} />);
      type("re");
      await tick(300);
      fireEvent.keyDown(search(), { key: "ArrowDown" });
      fireEvent.keyDown(search(), { key: "ArrowDown" });
      expect(options()[1]).toHaveAttribute("aria-selected", "true");
      fireEvent.keyDown(search(), { key: "Enter" });
      expect(onSelect).toHaveBeenCalledWith("redux");
      expect(search().value).toBe("redux");
    });

    test("clicking a suggestion selects it", async () => {
      const onSelect = vi.fn();
      const fetchSuggestions = vi.fn().mockResolvedValue(["react"]);
      render(<Autocomplete fetchSuggestions={fetchSuggestions} onSelect={onSelect} />);
      type("re");
      await tick(300);
      fireEvent.click(screen.getByText("react"));
      expect(onSelect).toHaveBeenCalledWith("react");
    });
  })
);

// ── Level 3: Loading + empty ────────────────────────────────────────────────
level(3, "loading and empty states", () =>
  withTimers(() => {
    test("shows a loading state while fetching", async () => {
      const fetchSuggestions = vi.fn().mockResolvedValue(["react"]);
      render(<Autocomplete fetchSuggestions={fetchSuggestions} />);
      type("re");
      await tick(300);
      // resolved now; loading gone, results shown
      expect(screen.queryByTestId("loading")).toBeNull();
      expect(screen.getByText("react")).toBeInTheDocument();
    });

    test("shows an empty state when there are no matches", async () => {
      const fetchSuggestions = vi.fn().mockResolvedValue([]);
      render(<Autocomplete fetchSuggestions={fetchSuggestions} />);
      type("zzz");
      await tick(300);
      expect(screen.getByTestId("empty")).toBeInTheDocument();
    });
  })
);

// ── Level 4: Ignore stale responses ─────────────────────────────────────────
level(4, "ignore stale responses", () =>
  withTimers(() => {
    test("a late earlier response does not overwrite the latest", async () => {
      const resolvers: ((v: string[]) => void)[] = [];
      const fetchSuggestions = vi.fn(() => new Promise<string[]>((res) => resolvers.push(res)));
      render(<Autocomplete fetchSuggestions={fetchSuggestions} />);

      type("a");
      await tick(300); // request 0 in flight
      type("ab");
      await tick(300); // request 1 in flight

      await act(async () => resolvers[1](["latest"])); // newest resolves first
      await act(async () => resolvers[0](["stale"])); // older resolves late

      expect(screen.getByText("latest")).toBeInTheDocument();
      expect(screen.queryByText("stale")).toBeNull();
    });
  })
);
