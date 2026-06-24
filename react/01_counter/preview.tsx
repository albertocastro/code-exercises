import { Counter } from "./solution";

// Live browser demo of your in-progress component.
export default function Demo() {
  return (
    <div>
      <h2>Counter</h2>
      <p>initial=0, min=0, max=10, step=1</p>
      <Counter
        initial={0}
        min={0}
        max={10}
        step={1}
        onChange={(v) => console.log("onChange:", v)}
      />
    </div>
  );
}
