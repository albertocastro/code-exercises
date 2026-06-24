import { render, screen, fireEvent } from "@testing-library/react";
import { Counter } from "./solution";

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

const count = () => screen.getByTestId("count").textContent;
const inc = () => fireEvent.click(screen.getByRole("button", { name: /increment/i }));
const dec = () => fireEvent.click(screen.getByRole("button", { name: /decrement/i }));

// ── Level 1: Basic counting ─────────────────────────────────────────────────
level(1, "increment / decrement", () => {
  test("renders 0 by default", () => {
    render(<Counter />);
    expect(count()).toBe("0");
  });

  test("renders the `initial` value", () => {
    render(<Counter initial={7} />);
    expect(count()).toBe("7");
  });

  test("increment adds 1", () => {
    render(<Counter />);
    inc();
    expect(count()).toBe("1");
  });

  test("decrement subtracts 1", () => {
    render(<Counter initial={5} />);
    dec();
    expect(count()).toBe("4");
  });

  test("multiple clicks accumulate", () => {
    render(<Counter />);
    inc();
    inc();
    inc();
    dec();
    expect(count()).toBe("2");
  });
});

// ── Level 2: Step ───────────────────────────────────────────────────────────
level(2, "custom step", () => {
  test("increments by `step`", () => {
    render(<Counter step={5} />);
    inc();
    expect(count()).toBe("5");
  });

  test("decrements by `step`", () => {
    render(<Counter initial={10} step={3} />);
    dec();
    expect(count()).toBe("7");
  });

  test("step defaults to 1", () => {
    render(<Counter />);
    inc();
    expect(count()).toBe("1");
  });
});

// ── Level 3: Bounds ─────────────────────────────────────────────────────────
level(3, "min / max bounds", () => {
  test("does not go below min", () => {
    render(<Counter initial={1} min={0} />);
    dec();
    dec();
    expect(count()).toBe("0");
  });

  test("does not go above max", () => {
    render(<Counter initial={9} max={10} />);
    inc();
    inc();
    expect(count()).toBe("10");
  });

  test("decrement is disabled at min", () => {
    render(<Counter initial={0} min={0} />);
    expect(screen.getByRole("button", { name: /decrement/i })).toBeDisabled();
  });

  test("increment is disabled at max", () => {
    render(<Counter initial={10} max={10} />);
    expect(screen.getByRole("button", { name: /increment/i })).toBeDisabled();
  });

  test("step respects bounds without overshooting", () => {
    render(<Counter initial={8} max={10} step={5} />);
    inc();
    expect(count()).toBe("10");
  });
});

// ── Level 4: Reset + onChange ───────────────────────────────────────────────
level(4, "reset and onChange", () => {
  test("reset returns to `initial`", () => {
    render(<Counter initial={3} />);
    inc();
    inc();
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));
    expect(count()).toBe("3");
  });

  test("onChange fires with the new value on increment", () => {
    const onChange = vi.fn();
    render(<Counter onChange={onChange} />);
    inc();
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  test("onChange fires with the new value on decrement", () => {
    const onChange = vi.fn();
    render(<Counter initial={5} onChange={onChange} />);
    dec();
    expect(onChange).toHaveBeenLastCalledWith(4);
  });

  test("onChange fires on reset", () => {
    const onChange = vi.fn();
    render(<Counter initial={2} onChange={onChange} />);
    inc();
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  test("onChange does not fire at a blocked bound", () => {
    const onChange = vi.fn();
    render(<Counter initial={0} min={0} onChange={onChange} />);
    dec();
    expect(onChange).not.toHaveBeenCalled();
  });
});
