import { CameraGrid } from "./solution";

export default function Demo() {
  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Command — Live Camera Grid</h2>
        <p>
          A multi-camera dashboard fetched from a live REST backend: a Flexbox
          grid of feeds with positioned status overlays, status that stays fresh
          on a polling timer, and a stateful parent driving presentational cards.
        </p>
      </div>
      <CameraGrid apiBase="/api/ex/28" pollMs={3000} />
    </div>
  );
}
