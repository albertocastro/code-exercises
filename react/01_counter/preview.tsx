import { useState } from "react";
import { Counter } from "./solution";

// Interactive harness: tweak the props the tests use (step, min, max, initial)
// and watch the component + the onChange log. Handy for debugging higher levels.
export default function Demo() {
  const [initial, setInitial] = useState(0);
  const [step, setStep] = useState(1);
  const [min, setMin] = useState<string>("");
  const [max, setMax] = useState<string>("");
  const [log, setLog] = useState<number[]>([]);

  const field = (label: string, value: number | string, set: (v: string) => void) => (
    <label style={{ display: "flex", flexDirection: "column", fontSize: 12, gap: 2 }}>
      {label}
      <input
        type="number"
        value={value}
        onChange={(e) => set(e.target.value)}
        style={{ width: 64, padding: "3px 6px" }}
      />
    </label>
  );

  return (
    <div>
      <h2>Counter</h2>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        {field("initial", initial, (v) => setInitial(Number(v) || 0))}
        {field("step", step, (v) => setStep(Number(v) || 1))}
        {field("min", min, setMin)}
        {field("max", max, setMax)}
      </div>
      <Counter
        key={`${initial}-${step}-${min}-${max}`}
        initial={initial}
        step={step}
        min={min === "" ? undefined : Number(min)}
        max={max === "" ? undefined : Number(max)}
        onChange={(v) => setLog((l) => [v, ...l].slice(0, 6))}
      />
      <p style={{ fontSize: 12, color: "#555", marginTop: 12 }}>
        onChange log: [{log.join(", ")}]
      </p>
    </div>
  );
}
