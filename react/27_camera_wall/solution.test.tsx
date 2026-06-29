import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { CameraWall } from "./solution";

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

const tile = (id: string) => screen.getByTestId(`tile-${id}`);
const elapsed = (id: string) => screen.getByTestId(`elapsed-${id}`).textContent;
const recordBtn = (id: string) =>
  within(tile(id)).getByRole("button", { name: /record|stop/i });
const bar = (name: RegExp) => screen.getByRole("button", { name });
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

// ── Level 1: Compose the wall ───────────────────────────────────────────────
level(1, "compose the wall", () => {
  test("renders one tile per camera id", () => {
    render(<CameraWall cameras={["A", "B", "C"]} />);
    expect(tile("A")).toBeInTheDocument();
    expect(tile("B")).toBeInTheDocument();
    expect(tile("C")).toBeInTheDocument();
  });

  test("each tile shows its own MM:SS timestamp, starting at 00:00", () => {
    render(<CameraWall cameras={["A", "B"]} />);
    expect(elapsed("A")).toBe("00:00");
    expect(elapsed("B")).toBe("00:00");
  });
});

// ── Level 2: Per-camera record / stop ───────────────────────────────────────
level(2, "per-camera record and stop", () => {
  test("the REC overlay is absent until that camera records", () => {
    render(<CameraWall cameras={["A", "B"]} />);
    expect(screen.queryByTestId("rec-A")).toBeNull();
    expect(screen.queryByTestId("rec-B")).toBeNull();
  });

  test("recording one camera advances only its clock and shows only its REC", () => {
    render(<CameraWall cameras={["A", "B"]} />);
    fireEvent.click(recordBtn("A"));
    advance(3000);
    expect(elapsed("A")).toBe("00:03");
    expect(elapsed("B")).toBe("00:00");
    expect(screen.getByTestId("rec-A")).toBeInTheDocument();
    expect(screen.queryByTestId("rec-B")).toBeNull();
  });

  test("formats minutes and seconds", () => {
    render(<CameraWall cameras={["A"]} />);
    fireEvent.click(recordBtn("A"));
    advance(75000);
    expect(elapsed("A")).toBe("01:15");
  });

  test("stop pauses that camera's clock", () => {
    render(<CameraWall cameras={["A"]} />);
    fireEvent.click(recordBtn("A")); // Record
    advance(2000);
    fireEvent.click(recordBtn("A")); // Stop
    advance(3000);
    expect(elapsed("A")).toBe("00:02");
    expect(screen.queryByTestId("rec-A")).toBeNull();
  });
});

// ── Level 3: Shared state across tiles ──────────────────────────────────────
level(3, "record all, stop all, and selection", () => {
  test("Record All starts every camera; Stop All stops them all", () => {
    render(<CameraWall cameras={["A", "B"]} />);
    fireEvent.click(bar(/record all/i));
    advance(2000);
    expect(elapsed("A")).toBe("00:02");
    expect(elapsed("B")).toBe("00:02");
    fireEvent.click(bar(/stop all/i));
    advance(2000);
    expect(elapsed("A")).toBe("00:02");
    expect(elapsed("B")).toBe("00:02");
  });

  test("clicking a tile selects exactly one camera at a time", () => {
    render(<CameraWall cameras={["A", "B"]} />);
    expect(tile("A")).toHaveAttribute("data-selected", "false");

    fireEvent.click(tile("A"));
    expect(tile("A")).toHaveAttribute("data-selected", "true");
    expect(tile("B")).toHaveAttribute("data-selected", "false");

    fireEvent.click(tile("B"));
    expect(tile("A")).toHaveAttribute("data-selected", "false");
    expect(tile("B")).toHaveAttribute("data-selected", "true");
  });

  test("clicking a tile's Record button does not also select the tile", () => {
    render(<CameraWall cameras={["A"]} />);
    fireEvent.click(recordBtn("A"));
    expect(tile("A")).toHaveAttribute("data-selected", "false");
  });
});

// ── Level 4: Snapshots & auto-stop ──────────────────────────────────────────
level(4, "snapshots and auto-stop", () => {
  const snapshot = () => screen.getByRole("button", { name: /^snapshot$/i });

  test("Snapshot is disabled until a recording camera is selected", () => {
    render(<CameraWall cameras={["A"]} />);
    expect(snapshot()).toBeDisabled();
    fireEvent.click(recordBtn("A")); // recording, but not selected
    expect(snapshot()).toBeDisabled();
    fireEvent.click(tile("A")); // now selected AND recording
    expect(snapshot()).toBeEnabled();
  });

  test("Snapshot captures the selected camera and its current time", () => {
    render(<CameraWall cameras={["A", "B"]} />);
    fireEvent.click(recordBtn("A"));
    advance(2000);
    fireEvent.click(tile("A"));
    fireEvent.click(snapshot());
    advance(1000);
    fireEvent.click(snapshot());

    const items = screen.getByTestId("snapshots").querySelectorAll("li");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("A · 00:02");
    expect(items[1]).toHaveTextContent("A · 00:03");
  });

  test("a camera auto-stops at maxSeconds and pins its time", () => {
    render(<CameraWall cameras={["A"]} maxSeconds={5} />);
    fireEvent.click(recordBtn("A"));
    advance(10000);
    expect(elapsed("A")).toBe("00:05");
    expect(screen.queryByTestId("rec-A")).toBeNull();
    expect(
      within(tile("A")).getByRole("button", { name: /record/i }),
    ).toBeInTheDocument();
  });
});
