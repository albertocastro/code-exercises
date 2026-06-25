import { Stopwatch } from "./solution";

export default function Demo() {
  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Stopwatch</h2>
        <p>Start, pause, reset, and record laps.</p>
      </div>
      <Stopwatch />
    </div>
  );
}
