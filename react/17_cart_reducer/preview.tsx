import { Cart, type Product } from "./solution";

const PRODUCTS: Product[] = [
  { id: 1, name: "Coffee", price: 10 },
  { id: 2, name: "Mug", price: 20 },
  { id: 3, name: "Beans", price: 30 },
];

export default function Demo() {
  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Shopping Cart</h2>
        <p>Add items, adjust quantities, try coupon SAVE10.</p>
      </div>
      <Cart products={PRODUCTS} />
    </div>
  );
}
