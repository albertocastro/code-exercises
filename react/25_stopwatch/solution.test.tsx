import { render, screen, fireEvent, act } from "@testing-library/react";
import { Stopwatch } from "./solution";

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

const time = () => screen.getByTestId("time").textContent;
const click = (name: RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

// ── Level 1: Start / pause ──────────────────────────────────────────────────
level(1, "start and pause", () => {
  test("counts up while running", () => {
    render(<Stopwatch />);
    click(/start/i);
    advance(3000);
    expect(time()).toBe("3");
  });

  test("pause stops the clock", () => {
    render(<Stopwatch />);
    click(/start/i);
    advance(3000);
    click(/pause/i);
    advance(2000);
    expect(time()).toBe("3");
  });
});

// ── Level 2: Reset ──────────────────────────────────────────────────────────
level(2, "reset", () => {
  test("reset returns to zero and stops", () => {
    render(<Stopwatch />);
    click(/start/i);
    advance(3000);
    click(/reset/i);
    expect(time()).toBe("0");
    advance(2000); // not running after reset
    expect(time()).toBe("0");
  });
});

// ── Level 3: Lap ────────────────────────────────────────────────────────────
level(3, "lap", () => {
  test("records laps at the current time", () => {
    render(<Stopwatch />);
    click(/start/i);
    advance(2000);
    click(/lap/i);
    advance(3000);
    click(/lap/i);
    const laps = screen.getByTestId("laps");
    expect(laps.querySelectorAll("li")).toHaveLength(2);
    expect(laps.querySelectorAll("li")[0]).toHaveTextContent("2");
    expect(laps.querySelectorAll("li")[1]).toHaveTextContent("5");
  });
});
