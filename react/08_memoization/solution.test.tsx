import { memo } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoDashboard } from "./solution";

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

// A memoized child that records each render.
function makeChild() {
  const renders = { count: 0 };
  const Child = memo(({ onAction, label }: { onAction: () => void; label: string }) => {
    renders.count++;
    return (
      <button onClick={onAction} data-testid="child">
        child-{label}
      </button>
    );
  });
  return { Child, renders };
}

const sum = (nums: number[]) => nums.reduce((a, b) => a + b, 0);

// ── Level 1: useMemo the expensive computation ──────────────────────────────
level(1, "memoize the computation", () => {
  test("computes once on mount and shows the result", () => {
    const compute = vi.fn(sum);
    const { Child } = makeChild();
    render(<MemoDashboard numbers={[1, 2, 3]} compute={compute} Child={Child} onAction={() => {}} />);
    expect(compute).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("result")).toHaveTextContent("6");
  });

  test("does not recompute on an unrelated state change", () => {
    const compute = vi.fn(sum);
    const { Child } = makeChild();
    render(<MemoDashboard numbers={[1, 2, 3]} compute={compute} Child={Child} onAction={() => {}} />);
    fireEvent.click(screen.getByText("increment"));
    fireEvent.click(screen.getByText("increment"));
    expect(screen.getByTestId("count")).toHaveTextContent("2");
    expect(compute).toHaveBeenCalledTimes(1); // still memoized
  });

  test("recomputes when numbers actually change", () => {
    const compute = vi.fn(sum);
    const { Child } = makeChild();
    const { rerender } = render(
      <MemoDashboard numbers={[1, 2, 3]} compute={compute} Child={Child} onAction={() => {}} />
    );
    rerender(<MemoDashboard numbers={[1, 2, 3, 4]} compute={compute} Child={Child} onAction={() => {}} />);
    expect(compute).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("result")).toHaveTextContent("10");
  });
});

// ── Level 2: useCallback so the memo'd child is stable ──────────────────────
level(2, "stable child via useCallback", () => {
  test("child renders once and survives unrelated updates", () => {
    const { Child, renders } = makeChild();
    render(<MemoDashboard numbers={[1]} compute={sum} Child={Child} onAction={() => {}} />);
    expect(renders.count).toBe(1);
    fireEvent.click(screen.getByText("increment"));
    fireEvent.click(screen.getByText("increment"));
    expect(renders.count).toBe(1); // handler stable -> no re-render
  });

  test("the child's action still calls onAction", () => {
    const { Child } = makeChild();
    const onAction = vi.fn();
    render(<MemoDashboard numbers={[1]} compute={sum} Child={Child} onAction={onAction} />);
    fireEvent.click(screen.getByTestId("child"));
    expect(onAction).toHaveBeenCalled();
  });
});

// ── Level 3: correct dependencies (not over-memoized) ───────────────────────
level(3, "correct dependencies", () => {
  test("the child re-renders when its own prop changes", () => {
    const { Child, renders } = makeChild();
    render(<MemoDashboard numbers={[1]} compute={sum} Child={Child} onAction={() => {}} />);
    expect(renders.count).toBe(1);
    fireEvent.click(screen.getByText("toggle")); // changes label
    expect(renders.count).toBe(2);
    expect(screen.getByTestId("child")).toHaveTextContent("child-On");
  });

  test("a new onAction is reflected (callback deps are correct)", () => {
    const { Child } = makeChild();
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(
      <MemoDashboard numbers={[1]} compute={sum} Child={Child} onAction={first} />
    );
    rerender(<MemoDashboard numbers={[1]} compute={sum} Child={Child} onAction={second} />);
    fireEvent.click(screen.getByTestId("child"));
    expect(second).toHaveBeenCalled();
    expect(first).not.toHaveBeenCalled();
  });
});
