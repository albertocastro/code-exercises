import { useState } from "react";
import { StarRating } from "./solution";

export default function Demo() {
  const [v, setV] = useState(0);

  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Star Rating</h2>
        <p>Controlled preview with the selected value shown below.</p>
      </div>
      <div className="exercise-card">
        <StarRating max={5} value={v} onChange={setV} />
        <p className="exercise-muted">Selected: {v}</p>
      </div>
    </div>
  );
}
