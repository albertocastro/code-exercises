import { render, screen, fireEvent, within } from "@testing-library/react";
import { CheckoutWizard } from "./solution";

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

const step = () => screen.getByTestId("step-indicator").textContent;
const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const next = () => fireEvent.click(screen.getByRole("button", { name: "Next" }));
const fillShipping = () => {
  type("name", "Ada");
  type("address", "1 Engine St");
};

// ── Level 1: Navigation ─────────────────────────────────────────────────────
level(1, "step navigation", () => {
  test("starts on the first step", () => {
    render(<CheckoutWizard />);
    expect(step()).toBe("1 of 3");
    expect(screen.getByRole("heading", { name: "Shipping" })).toBeInTheDocument();
  });

  test("next and back move between steps", () => {
    render(<CheckoutWizard />);
    fillShipping();
    next();
    expect(step()).toBe("2 of 3");
    type("card", "4242424242");
    next();
    expect(step()).toBe("3 of 3");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(step()).toBe("2 of 3");
  });
});

// ── Level 2: Per-step validation ────────────────────────────────────────────
level(2, "per-step validation", () => {
  test("cannot advance from an empty shipping step", () => {
    render(<CheckoutWizard />);
    next();
    expect(step()).toBe("1 of 3");
    expect(screen.getByTestId("step-error")).toBeInTheDocument();
  });

  test("advances once shipping is filled", () => {
    render(<CheckoutWizard />);
    fillShipping();
    next();
    expect(step()).toBe("2 of 3");
  });

  test("payment requires a card", () => {
    render(<CheckoutWizard />);
    fillShipping();
    next();
    next(); // no card
    expect(step()).toBe("2 of 3");
  });
});

// ── Level 3: Review + complete ──────────────────────────────────────────────
level(3, "review and complete", () => {
  const goToReview = () => {
    fillShipping();
    next();
    type("card", "4242424242");
    next();
  };

  test("review shows the entered details", () => {
    render(<CheckoutWizard />);
    goToReview();
    const review = screen.getByTestId("review");
    expect(within(review).getByText("Ada")).toBeInTheDocument();
    expect(within(review).getByText("1 Engine St")).toBeInTheDocument();
    expect(within(review).getByText("4242424242")).toBeInTheDocument();
  });

  test("complete reports all the data", () => {
    const onComplete = vi.fn();
    render(<CheckoutWizard onComplete={onComplete} />);
    goToReview();
    fireEvent.click(screen.getByRole("button", { name: "Complete" }));
    expect(onComplete).toHaveBeenCalledWith({
      name: "Ada",
      address: "1 Engine St",
      card: "4242424242",
    });
  });
});
