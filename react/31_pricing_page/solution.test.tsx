import { render, screen, fireEvent } from "@testing-library/react";
import App from "./solution";

/**
 * Open-ended exercise: black-box tests only.
 *
 * These tests query EXCLUSIVELY by `data-testid`, and assert on the visible
 * text content of those nodes (plus user clicks via `fireEvent`). They never
 * inspect tag names, DOM hierarchy, CSS classes, or ARIA roles — the learner
 * owns all of that. The only contract is: the required test IDs exist and
 * behave as described.
 */

const text = (testid: string) => screen.getByTestId(testid).textContent;
const click = (testid: string) => fireEvent.click(screen.getByTestId(testid));

describe("Pricing Page — contract elements exist", () => {
  test("billing toggle, three prices, three CTAs, readout, featured", () => {
    render(<App />);
    expect(screen.getByTestId("billing-monthly")).toBeInTheDocument();
    expect(screen.getByTestId("billing-annual")).toBeInTheDocument();
    expect(screen.getByTestId("price-starter")).toBeInTheDocument();
    expect(screen.getByTestId("price-pro")).toBeInTheDocument();
    expect(screen.getByTestId("price-enterprise")).toBeInTheDocument();
    expect(screen.getByTestId("select-starter")).toBeInTheDocument();
    expect(screen.getByTestId("select-pro")).toBeInTheDocument();
    expect(screen.getByTestId("select-enterprise")).toBeInTheDocument();
    expect(screen.getByTestId("selected-plan")).toBeInTheDocument();
    expect(screen.getByTestId("featured-plan")).toBeInTheDocument();
  });
});

describe("Pricing Page — default (monthly) prices", () => {
  test("default billing is monthly: $9 / $29 / $99", () => {
    render(<App />);
    expect(text("price-starter")).toBe("$9");
    expect(text("price-pro")).toBe("$29");
    expect(text("price-enterprise")).toBe("$99");
  });

  test("explicitly clicking Monthly keeps monthly prices", () => {
    render(<App />);
    click("billing-monthly");
    expect(text("price-starter")).toBe("$9");
    expect(text("price-pro")).toBe("$29");
    expect(text("price-enterprise")).toBe("$99");
  });
});

describe("Pricing Page — annual billing (20% off, rounded per month)", () => {
  test("annual shows round(monthly x 0.8): $7 / $23 / $79", () => {
    render(<App />);
    click("billing-annual");
    // 9*0.8=7.2 -> 7, 29*0.8=23.2 -> 23, 99*0.8=79.2 -> 79
    expect(text("price-starter")).toBe("$7");
    expect(text("price-pro")).toBe("$23");
    expect(text("price-enterprise")).toBe("$79");
  });

  test("toggling annual then back to monthly restores $9 / $29 / $99", () => {
    render(<App />);
    click("billing-annual");
    expect(text("price-pro")).toBe("$23");
    click("billing-monthly");
    expect(text("price-starter")).toBe("$9");
    expect(text("price-pro")).toBe("$29");
    expect(text("price-enterprise")).toBe("$99");
  });

  test("all three displays update together on each toggle", () => {
    render(<App />);
    click("billing-annual");
    expect(text("price-starter")).toBe("$7");
    expect(text("price-enterprise")).toBe("$79");
    click("billing-monthly");
    expect(text("price-starter")).toBe("$9");
    expect(text("price-enterprise")).toBe("$99");
  });
});

describe("Pricing Page — selection state", () => {
  test("initial selected-plan reads 'None'", () => {
    render(<App />);
    expect(text("selected-plan")).toBe("None");
  });

  test("clicking a plan CTA sets selected-plan to that plan's name", () => {
    render(<App />);
    click("select-pro");
    expect(text("selected-plan")).toBe("Pro");
  });

  test("selection can move between plans", () => {
    render(<App />);
    click("select-starter");
    expect(text("selected-plan")).toBe("Starter");
    click("select-enterprise");
    expect(text("selected-plan")).toBe("Enterprise");
    click("select-pro");
    expect(text("selected-plan")).toBe("Pro");
  });

  test("selection is independent of the billing toggle", () => {
    render(<App />);
    click("select-starter");
    click("billing-annual");
    // toggling billing must not clear the selection
    expect(text("selected-plan")).toBe("Starter");
    // and prices still reflect annual
    expect(text("price-starter")).toBe("$7");
  });
});

describe("Pricing Page — featured plan", () => {
  test("featured-plan names the Pro tier", () => {
    render(<App />);
    expect(text("featured-plan")).toBe("Pro");
  });
});
