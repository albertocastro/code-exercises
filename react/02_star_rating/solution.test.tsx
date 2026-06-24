import { render, screen, fireEvent } from "@testing-library/react";
import { StarRating } from "./solution";

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

const stars = () => screen.getAllByRole("button");
const star = (n: number) =>
  screen.getByRole("button", { name: new RegExp(`^${n} stars?$`, "i") });
const filled = () =>
  stars().filter((b) => b.getAttribute("aria-pressed") === "true").length;

// ── Level 1: Click to rate ──────────────────────────────────────────────────
level(1, "click to rate", () => {
  test("renders 5 stars by default", () => {
    render(<StarRating />);
    expect(stars()).toHaveLength(5);
  });

  test("renders `max` stars", () => {
    render(<StarRating max={10} />);
    expect(stars()).toHaveLength(10);
  });

  test("nothing filled initially", () => {
    render(<StarRating />);
    expect(filled()).toBe(0);
  });

  test("clicking star 3 fills the first 3", () => {
    render(<StarRating />);
    fireEvent.click(star(3));
    expect(filled()).toBe(3);
  });

  test("re-rating updates the fill count", () => {
    render(<StarRating />);
    fireEvent.click(star(5));
    expect(filled()).toBe(5);
    fireEvent.click(star(2));
    expect(filled()).toBe(2);
  });
});

// ── Level 2: Hover preview ──────────────────────────────────────────────────
level(2, "hover preview", () => {
  test("hovering previews the fill", () => {
    render(<StarRating />);
    fireEvent.mouseEnter(star(4));
    expect(filled()).toBe(4);
  });

  test("leaving restores the actual rating", () => {
    render(<StarRating />);
    fireEvent.click(star(2));
    fireEvent.mouseEnter(star(4));
    expect(filled()).toBe(4);
    fireEvent.mouseLeave(star(4));
    expect(filled()).toBe(2);
  });

  test("leaving with no rating restores to empty", () => {
    render(<StarRating />);
    fireEvent.mouseEnter(star(3));
    fireEvent.mouseLeave(star(3));
    expect(filled()).toBe(0);
  });
});

// ── Level 3: Controlled / readOnly / clear ──────────────────────────────────
level(3, "controlled, readOnly, clear", () => {
  test("controlled `value` drives the fill", () => {
    render(<StarRating value={3} onChange={() => {}} />);
    expect(filled()).toBe(3);
  });

  test("controlled component does not self-update, but fires onChange", () => {
    const onChange = vi.fn();
    render(<StarRating value={3} onChange={onChange} />);
    fireEvent.click(star(5));
    expect(onChange).toHaveBeenCalledWith(5);
    expect(filled()).toBe(3); // parent never updated `value`
  });

  test("readOnly ignores interaction", () => {
    const onChange = vi.fn();
    render(<StarRating value={2} readOnly onChange={onChange} />);
    fireEvent.click(star(4));
    expect(onChange).not.toHaveBeenCalled();
    expect(filled()).toBe(2);
  });

  test("clicking the current rating clears it", () => {
    const onChange = vi.fn();
    render(<StarRating onChange={onChange} />);
    fireEvent.click(star(3));
    fireEvent.click(star(3));
    expect(filled()).toBe(0);
    expect(onChange).toHaveBeenLastCalledWith(0);
  });
});
