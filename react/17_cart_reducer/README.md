# React 17 — Shopping Cart (useReducer)

**Estimated time:** 40–55 minutes
**Goal:** Model non-trivial state transitions with `useReducer` and derive values.

You edit `solution.tsx`.

## Contract
```ts
interface Product { id: number; name: string; price: number; }
interface CartProps { products: Product[]; }
```
"Add &lt;name&gt;" buttons; lines as `role="listitem"` with `data-testid="qty-<id>"`;
per-line **increase/decrease/remove &lt;name&gt;** buttons; a **coupon** input +
**Apply**/**Clear**; `data-testid="subtotal" | "discount" | "total"`.

## Levels
1. **Add** — add a product (increment quantity if already in the cart); subtotal.
2. **Quantities** — increase/decrease; decreasing below 1 removes the line.
3. **Remove + clear** — remove a single line; clear the whole cart.
4. **Coupon** — `"SAVE10"` applies a 10% discount; show discount and total.
