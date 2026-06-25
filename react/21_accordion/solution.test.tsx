import { render, screen, fireEvent } from "@testing-library/react";
import { Accordion, AccordionItem } from "./solution";

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

const sample = (allowMultiple = false) => (
  <Accordion allowMultiple={allowMultiple}>
    <AccordionItem title="A">contentA</AccordionItem>
    <AccordionItem title="B">contentB</AccordionItem>
  </Accordion>
);
const header = (name: string) => screen.getByRole("button", { name });

// ── Level 1: Toggle items ───────────────────────────────────────────────────
level(1, "toggle items", () => {
  test("panels start collapsed", () => {
    render(sample());
    expect(header("A")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("contentA")).toBeNull();
  });

  test("clicking a header expands and collapses it", () => {
    render(sample());
    fireEvent.click(header("A"));
    expect(header("A")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("contentA")).toBeInTheDocument();
    fireEvent.click(header("A"));
    expect(screen.queryByText("contentA")).toBeNull();
  });
});

// ── Level 2: Single-open ────────────────────────────────────────────────────
level(2, "single open", () => {
  test("opening one closes the others", () => {
    render(sample());
    fireEvent.click(header("A"));
    fireEvent.click(header("B"));
    expect(screen.queryByText("contentA")).toBeNull();
    expect(screen.getByText("contentB")).toBeInTheDocument();
  });
});

// ── Level 3: allowMultiple ──────────────────────────────────────────────────
level(3, "allow multiple", () => {
  test("multiple panels stay open", () => {
    render(sample(true));
    fireEvent.click(header("A"));
    fireEvent.click(header("B"));
    expect(screen.getByText("contentA")).toBeInTheDocument();
    expect(screen.getByText("contentB")).toBeInTheDocument();
  });
});
