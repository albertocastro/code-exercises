import { useState } from "react";
import { SearchList } from "./solution";

const FRUITS = ["Apple", "Banana", "Cherry", "Date", "Avocado", "Grape", "Mango"];

export default function Demo() {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div>
      <h2>Searchable List</h2>
      <SearchList items={FRUITS} placeholder="Search fruit…" onSelect={setPicked} />
      <p>Picked: {picked ?? "—"}</p>
    </div>
  );
}
