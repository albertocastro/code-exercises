import { CameraWall } from "./solution";

export default function Demo() {
  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Security Camera Wall</h2>
        <p>
          A grid of camera tiles with per-camera and global recording, a live
          REC overlay, selection, and snapshots — composed from a stateful wall
          and presentational tiles.
        </p>
      </div>
      <CameraWall cameras={["CAM-01", "CAM-02", "CAM-03", "CAM-04"]} maxSeconds={30} />
    </div>
  );
}
