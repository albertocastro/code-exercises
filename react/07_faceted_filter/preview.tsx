import { FilterList, type Item } from "./solution";

const ITEMS: Item[] = [
  { id: 1, name: "Laptop", category: "Electronics", price: 1000 },
  { id: 2, name: "Headphones", category: "Electronics", price: 150 },
  { id: 3, name: "T-Shirt", category: "Clothing", price: 25 },
  { id: 4, name: "Sneakers", category: "Clothing", price: 80 },
  { id: 5, name: "Coffee", category: "Food", price: 12 },
  { id: 6, name: "Chocolate", category: "Food", price: 6 },
];

export default function Demo() {
  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Faceted Filter</h2>
        <p>Search and toggle categories; counts update live.</p>
      </div>
      <FilterList items={ITEMS} />
    </div>
  );
}
