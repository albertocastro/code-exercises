import { useState } from "react";
import { SearchList } from "./solution";

const FRUITS = ["Apple", "Banana", "Cherry", "Date", "Avocado", "Grape", "Mango"];

export default function Demo() {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Searchable List</h2>
        <p>Filter fruit names and select with the mouse or keyboard.</p>
      </div>
      <SearchList items={FRUITS} placeholder="Search fruit…" onSelect={setPicked} />
      <p className="exercise-muted">Picked: {picked ?? "—"}</p>
    </div>
  );
}
