import { render, screen, fireEvent } from "@testing-library/react";
import App from "./solution";

/**
 * Open-ended exercise: black-box tests only.
 *
 * These tests query EXCLUSIVELY by `data-testid`, and assert on the visible
 * text content of the output nodes. They never inspect tag names, DOM
 * hierarchy, CSS classes, or ARIA roles — the learner owns all of that. The
 * only contract is: the six test IDs exist and behave as described.
 */

const set = (testid: string, value: string) =>
  fireEvent.change(screen.getByTestId(testid), { target: { value } });

const text = (testid: string) => screen.getByTestId(testid).textContent;

describe("Tip Calculator — contract elements exist", () => {
  test("the three inputs and three outputs are all present", () => {
    render(<App />);
    expect(screen.getByTestId("bill-input")).toBeInTheDocument();
    expect(screen.getByTestId("tip-input")).toBeInTheDocument();
    expect(screen.getByTestId("party-size-input")).toBeInTheDocument();
    expect(screen.getByTestId("tip-amount")).toBeInTheDocument();
    expect(screen.getByTestId("total-amount")).toBeInTheDocument();
    expect(screen.getByTestId("per-person-amount")).toBeInTheDocument();
  });
});

describe("Tip Calculator — core math", () => {
  test("tip amount = bill x tip%, shown to 2 decimals", () => {
    render(<App />);
    set("bill-input", "100");
    set("tip-input", "15");
    expect(text("tip-amount")).toBe("15.00");
  });

  test("total = bill + tip", () => {
    render(<App />);
    set("bill-input", "100");
    set("tip-input", "15");
    expect(text("total-amount")).toBe("115.00");
  });

  test("per-person = total / party size", () => {
    render(<App />);
    set("bill-input", "100");
    set("tip-input", "20"); // tip 20, total 120
    set("party-size-input", "4");
    expect(text("per-person-amount")).toBe("30.00");
  });

  test("everything recomputes when an input changes", () => {
    render(<App />);
    set("bill-input", "80");
    set("tip-input", "10");
    expect(text("tip-amount")).toBe("8.00");
    expect(text("total-amount")).toBe("88.00");

    set("tip-input", "25"); // change tip% only
    expect(text("tip-amount")).toBe("20.00");
    expect(text("total-amount")).toBe("100.00");
  });
});

describe("Tip Calculator — 2-decimal currency formatting", () => {
  test("non-round results keep exactly two decimals", () => {
    render(<App />);
    set("bill-input", "53.45");
    set("tip-input", "18"); // tip = 9.621 -> "9.62"
    expect(text("tip-amount")).toBe("9.62");
    expect(text("total-amount")).toBe("63.07"); // 53.45 + 9.621 = 63.071 -> "63.07"
  });

  test("per-person that doesn't divide evenly is still 2 decimals", () => {
    render(<App />);
    set("bill-input", "100");
    set("tip-input", "0"); // total 100
    set("party-size-input", "3"); // 100 / 3 = 33.333...
    expect(text("per-person-amount")).toBe("33.33");
  });

  test("whole-number results still render two decimals", () => {
    render(<App />);
    set("bill-input", "50");
    set("tip-input", "0");
    expect(text("total-amount")).toBe("50.00");
  });
});

describe("Tip Calculator — empty / non-numeric bill and tip are treated as 0", () => {
  test("initial state (all blank) reads as zeros", () => {
    render(<App />);
    expect(text("tip-amount")).toBe("0.00");
    expect(text("total-amount")).toBe("0.00");
    expect(text("per-person-amount")).toBe("0.00");
  });

  test("blank bill with a tip% yields zero everywhere", () => {
    render(<App />);
    set("tip-input", "20");
    expect(text("tip-amount")).toBe("0.00");
    expect(text("total-amount")).toBe("0.00");
  });

  test("non-numeric bill is treated as 0", () => {
    render(<App />);
    set("bill-input", "abc");
    set("tip-input", "15");
    expect(text("tip-amount")).toBe("0.00");
    expect(text("total-amount")).toBe("0.00");
  });

  test("blank tip% means no tip: total equals the bill", () => {
    render(<App />);
    set("bill-input", "60");
    expect(text("tip-amount")).toBe("0.00");
    expect(text("total-amount")).toBe("60.00");
  });
});

describe("Tip Calculator — party size is at least 1 (divide-by-zero guard)", () => {
  test("blank party size splits across 1 (per-person equals total)", () => {
    render(<App />);
    set("bill-input", "100");
    set("tip-input", "0");
    expect(text("per-person-amount")).toBe("100.00");
  });

  test("party size of 0 is treated as 1", () => {
    render(<App />);
    set("bill-input", "100");
    set("tip-input", "0");
    set("party-size-input", "0");
    expect(text("per-person-amount")).toBe("100.00");
  });

  test("negative party size is treated as 1", () => {
    render(<App />);
    set("bill-input", "100");
    set("tip-input", "0");
    set("party-size-input", "-3");
    expect(text("per-person-amount")).toBe("100.00");
  });

  test("non-numeric party size is treated as 1", () => {
    render(<App />);
    set("bill-input", "100");
    set("tip-input", "0");
    set("party-size-input", "xyz");
    expect(text("per-person-amount")).toBe("100.00");
  });

  test("a valid party size of 2 splits the total evenly", () => {
    render(<App />);
    set("bill-input", "100");
    set("tip-input", "0");
    set("party-size-input", "2");
    expect(text("per-person-amount")).toBe("50.00");
  });
});
