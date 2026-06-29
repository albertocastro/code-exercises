import { CameraRecorder } from "./solution";

export default function Demo() {
  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Camera Recorder</h2>
        <p>Record a feed with an overlaid REC indicator, timer, and snapshots.</p>
      </div>
      <CameraRecorder maxSeconds={30} />
    </div>
  );
}
