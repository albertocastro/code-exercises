import { memo, useRef } from "react";
import { MemoDashboard } from "./solution";

// The badge shows how many times the child has rendered — with memoization done
// right, "increment" won't bump it but "toggle" will.
const Child = memo(({ onAction, label }: { onAction: () => void; label: string }) => {
  const renders = useRef(0);
  renders.current++;
  return (
    <button className="exercise-button" onClick={onAction}>
      Child · rendered {renders.current}× · {label}
    </button>
  );
});

export default function Demo() {
  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Memoization</h2>
        <p>"increment" shouldn't re-render the child; "toggle" should.</p>
      </div>
      <MemoDashboard
        numbers={[1, 2, 3, 4, 5]}
        compute={(n) => n.reduce((a, b) => a + b, 0)}
        Child={Child}
        onAction={() => console.log("child action")}
      />
    </div>
  );
}
