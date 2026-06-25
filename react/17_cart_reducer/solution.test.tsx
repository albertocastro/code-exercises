import { render, screen, fireEvent } from "@testing-library/react";
import { Cart, type Product } from "./solution";

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

const PRODUCTS: Product[] = [
  { id: 1, name: "Apple", price: 10 },
  { id: 2, name: "Banana", price: 20 },
  { id: 3, name: "Cherry", price: 30 },
];

const add = (name: string) => fireEvent.click(screen.getByRole("button", { name: `Add ${name}` }));
const subtotal = () => screen.getByTestId("subtotal").textContent;
const items = () => screen.queryAllByRole("listitem");

// ── Level 1: Add + subtotal ─────────────────────────────────────────────────
level(1, "add items", () => {
  test("adds a product as a line item", () => {
    render(<Cart products={PRODUCTS} />);
    add("Apple");
    expect(items()).toHaveLength(1);
    expect(screen.getByTestId("qty-1")).toHaveTextContent("1");
    expect(subtotal()).toBe("10");
  });

  test("adding the same product increments quantity", () => {
    render(<Cart products={PRODUCTS} />);
    add("Apple");
    add("Apple");
    expect(items()).toHaveLength(1);
    expect(screen.getByTestId("qty-1")).toHaveTextContent("2");
    expect(subtotal()).toBe("20");
  });

  test("subtotal sums across products", () => {
    render(<Cart products={PRODUCTS} />);
    add("Apple");
    add("Banana");
    expect(subtotal()).toBe("30");
  });
});

// ── Level 2: Quantities ─────────────────────────────────────────────────────
level(2, "quantities", () => {
  test("increase and decrease quantity", () => {
    render(<Cart products={PRODUCTS} />);
    add("Apple");
    fireEvent.click(screen.getByRole("button", { name: "increase Apple" }));
    expect(screen.getByTestId("qty-1")).toHaveTextContent("2");
    fireEvent.click(screen.getByRole("button", { name: "decrease Apple" }));
    expect(screen.getByTestId("qty-1")).toHaveTextContent("1");
  });

  test("decreasing below 1 removes the line", () => {
    render(<Cart products={PRODUCTS} />);
    add("Apple");
    fireEvent.click(screen.getByRole("button", { name: "decrease Apple" }));
    expect(items()).toHaveLength(0);
  });
});

// ── Level 3: Remove + clear ─────────────────────────────────────────────────
level(3, "remove and clear", () => {
  test("remove deletes a line", () => {
    render(<Cart products={PRODUCTS} />);
    add("Apple");
    add("Banana");
    fireEvent.click(screen.getByRole("button", { name: "remove Apple" }));
    expect(items()).toHaveLength(1);
    expect(subtotal()).toBe("20");
  });

  test("clear empties the cart", () => {
    render(<Cart products={PRODUCTS} />);
    add("Apple");
    add("Banana");
    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(items()).toHaveLength(0);
    expect(subtotal()).toBe("0");
  });
});

// ── Level 4: Coupon ─────────────────────────────────────────────────────────
level(4, "coupon", () => {
  test("SAVE10 applies a 10% discount", () => {
    render(<Cart products={PRODUCTS} />);
    add("Apple");
    add("Banana"); // subtotal 30
    fireEvent.change(screen.getByLabelText("coupon"), { target: { value: "SAVE10" } });
    fireEvent.click(screen.getByRole("button", { name: /apply/i }));
    expect(screen.getByTestId("discount")).toHaveTextContent("3");
    expect(screen.getByTestId("total")).toHaveTextContent("27");
  });

  test("an unknown coupon does nothing", () => {
    render(<Cart products={PRODUCTS} />);
    add("Apple");
    fireEvent.change(screen.getByLabelText("coupon"), { target: { value: "NOPE" } });
    fireEvent.click(screen.getByRole("button", { name: /apply/i }));
    expect(screen.getByTestId("discount")).toHaveTextContent("0");
    expect(screen.getByTestId("total")).toHaveTextContent("10");
  });
});
