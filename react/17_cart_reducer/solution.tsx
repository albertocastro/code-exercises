import { useState } from "react";

export interface Product {
  id: number;
  name: string;
  price: number;
}
export interface CartProps {
  products: Product[];
}

/**
 * Build a shopping cart with useReducer. See README.md.
 *
 * The tests rely on "Add <name>" buttons, line items as role="listitem" with a
 * data-testid="qty-<id>", per-line "increase/decrease/remove <name>" buttons, a
 * "coupon" input + "Apply"/"Clear" buttons, and data-testid="subtotal" /
 * "discount" / "total".
 */
export function Cart({ products }: CartProps) {
  const [items] = useState<{ product: Product; qty: number }[]>([]);
  const subtotal = items.reduce((s, l) => s + l.product.price * l.qty, 0);

  // TODO Level 1: add a product (increment qty if already present); show subtotal.
  // TODO Level 2: increase/decrease quantity (decrease below 1 removes the line).
  // TODO Level 3: remove a line; clear the cart.
  // TODO Level 4: coupon "SAVE10" => 10% off (data-testid discount/total).
  // Hint: model this with useReducer.

  return (
    <div className="exercise-card">
      <div className="exercise-row">
        {products.map((p) => (
          <button className="exercise-button" key={p.id}>
            Add {p.name}
          </button>
        ))}
      </div>
      <ul className="exercise-list">
        {items.map((l) => (
          <li className="exercise-list-item" key={l.product.id}>
            <span>{l.product.name}</span>
            <span data-testid={`qty-${l.product.id}`}>{l.qty}</span>
          </li>
        ))}
      </ul>
      <div>
        subtotal <span data-testid="subtotal">{subtotal}</span> · discount{" "}
        <span data-testid="discount">0</span> · total <span data-testid="total">{subtotal}</span>
      </div>
    </div>
  );
}
