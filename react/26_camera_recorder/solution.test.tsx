import { render, screen, fireEvent, act } from "@testing-library/react";
import { CameraRecorder } from "./solution";

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

const elapsed = () => screen.getByTestId("elapsed").textContent;
const click = (name: RegExp) =>
  fireEvent.click(screen.getByRole("button", { name }));
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

// ── Level 1: Record / stop timer ────────────────────────────────────────────
level(1, "record and stop", () => {
  test("counts up as MM:SS while recording", () => {
    render(<CameraRecorder />);
    expect(elapsed()).toBe("00:00");
    click(/record/i);
    advance(3000);
    expect(elapsed()).toBe("00:03");
  });

  test("formats minutes and seconds", () => {
    render(<CameraRecorder />);
    click(/record/i);
    advance(75000);
    expect(elapsed()).toBe("01:15");
  });

  test("stop pauses the clock", () => {
    render(<CameraRecorder />);
    click(/record/i);
    advance(3000);
    click(/stop/i);
    advance(5000);
    expect(elapsed()).toBe("00:03");
  });
});

// ── Level 2: REC overlay ────────────────────────────────────────────────────
level(2, "rec overlay", () => {
  test("indicator is absent until recording", () => {
    render(<CameraRecorder />);
    expect(screen.queryByTestId("rec-indicator")).toBeNull();
  });

  test("indicator appears while recording and disappears on stop", () => {
    render(<CameraRecorder />);
    click(/record/i);
    expect(screen.getByTestId("rec-indicator")).toBeInTheDocument();
    click(/stop/i);
    expect(screen.queryByTestId("rec-indicator")).toBeNull();
  });
});

// ── Level 3: Auto-stop at max duration ──────────────────────────────────────
level(3, "auto-stop", () => {
  test("stops automatically at maxSeconds and pins the time", () => {
    render(<CameraRecorder maxSeconds={5} />);
    click(/record/i);
    advance(10000);
    expect(elapsed()).toBe("00:05");
    // it really stopped: the REC overlay is gone and the button resets
    expect(screen.queryByTestId("rec-indicator")).toBeNull();
    expect(screen.getByRole("button", { name: /record/i })).toBeInTheDocument();
  });
});

// ── Level 4: Snapshots ──────────────────────────────────────────────────────
level(4, "snapshots", () => {
  test("snapshot button is disabled until recording", () => {
    render(<CameraRecorder />);
    expect(screen.getByRole("button", { name: /snapshot/i })).toBeDisabled();
    click(/record/i);
    expect(screen.getByRole("button", { name: /snapshot/i })).toBeEnabled();
  });

  test("captures the current time into the snapshots list", () => {
    render(<CameraRecorder />);
    click(/record/i);
    advance(2000);
    click(/snapshot/i);
    advance(1000);
    click(/snapshot/i);
    const items = screen.getByTestId("snapshots").querySelectorAll("li");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("00:02");
    expect(items[1]).toHaveTextContent("00:03");
  });
});
