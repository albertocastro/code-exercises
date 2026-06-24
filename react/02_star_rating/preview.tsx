import { useState } from "react";
import { StarRating } from "./solution";

export default function Demo() {
  const [v, setV] = useState(0);
  return (
    <div>
      <h2>Star Rating</h2>
      <StarRating max={5} value={v} onChange={setV} />
      <p>Selected: {v}</p>
    </div>
  );
}
