import { render, screen, fireEvent, act } from "@testing-library/react";
import { LikeButton } from "./solution";

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

const btn = () => screen.getByRole("button");
const count = () => screen.getByTestId("count").textContent;

// ── Level 1: Toggle + server call ───────────────────────────────────────────
level(1, "toggle and call the server", () => {
  test("renders the initial state", () => {
    render(<LikeButton initialLiked={false} initialCount={3} toggleLike={vi.fn().mockResolvedValue(undefined)} />);
    expect(btn()).toHaveAttribute("aria-pressed", "false");
    expect(count()).toBe("3");
  });

  test("clicking calls toggleLike with the new state", async () => {
    const toggleLike = vi.fn().mockResolvedValue(undefined);
    render(<LikeButton toggleLike={toggleLike} />);
    await act(async () => {
      fireEvent.click(btn());
    });
    expect(toggleLike).toHaveBeenCalledWith(true);
    expect(btn()).toHaveAttribute("aria-pressed", "true");
    expect(count()).toBe("1");
  });
});

// ── Level 2: Optimistic ─────────────────────────────────────────────────────
level(2, "optimistic update", () => {
  test("updates immediately, before the server resolves", () => {
    // never resolves during the test
    const toggleLike = vi.fn(() => new Promise<void>(() => {}));
    render(<LikeButton toggleLike={toggleLike} />);
    fireEvent.click(btn());
    // no await: the UI should already reflect the change
    expect(btn()).toHaveAttribute("aria-pressed", "true");
    expect(count()).toBe("1");
  });
});

// ── Level 3: Rollback on failure ────────────────────────────────────────────
level(3, "rollback on failure", () => {
  test("reverts when the server call rejects", async () => {
    const toggleLike = vi.fn().mockRejectedValue(new Error("network"));
    render(<LikeButton initialCount={5} toggleLike={toggleLike} />);
    await act(async () => {
      fireEvent.click(btn());
    });
    expect(btn()).toHaveAttribute("aria-pressed", "false");
    expect(count()).toBe("5");
  });

  test("keeps the change when the server call succeeds", async () => {
    const toggleLike = vi.fn().mockResolvedValue(undefined);
    render(<LikeButton initialCount={5} toggleLike={toggleLike} />);
    await act(async () => {
      fireEvent.click(btn());
    });
    expect(btn()).toHaveAttribute("aria-pressed", "true");
    expect(count()).toBe("6");
  });
});
