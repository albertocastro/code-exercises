import { CallLog } from "./solution";

export default function Demo() {
  const now = Date.now();
  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Call Log</h2>
        <p>Render the calls, then add status filtering, summary stats, and sorting.</p>
      </div>
      <CallLog
        calls={[
          { id: "1", agent: "Ava Chen", status: "completed", durationSec: 75, startedAt: now - 60000 },
          { id: "2", agent: "Ben Ortiz", status: "failed", durationSec: 5, startedAt: now - 50000 },
          { id: "3", agent: "Cora Lin", status: "in_progress", durationSec: 605, startedAt: now - 40000 },
          { id: "4", agent: "Dev Rao", status: "completed", durationSec: 100, startedAt: now - 30000 },
          { id: "5", agent: "Eli Frank", status: "completed", durationSec: 212, startedAt: now - 20000 },
        ]}
      />
    </div>
  );
}
