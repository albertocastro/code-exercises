import { VirtualList } from "./solution";

const ITEMS = Array.from({ length: 10000 }, (_, i) => `Row ${i}`);

export default function Demo() {
  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Virtualized List</h2>
        <p>10,000 rows — only the visible ones are in the DOM.</p>
      </div>
      <VirtualList items={ITEMS} itemHeight={28} height={280} overscan={3} />
    </div>
  );
}
