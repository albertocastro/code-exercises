import { useState } from "react";
import { fmtTime } from "./useTimer";
import type { LevelStat } from "./progress";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="insight-stat">
      <div className="insight-stat-value">{value}</div>
      <div className="insight-stat-label">{label}</div>
    </div>
  );
}

export function InsightsPanel({
  categoryId,
  exerciseId,
  level,
  totalLevels,
  solutionCode,
  readme,
  stat,
  complete,
  onNext,
  onClose,
}: {
  categoryId: string;
  exerciseId: string;
  level: number;
  totalLevels: number;
  solutionCode: string;
  readme: string;
  stat: LevelStat | undefined;
  complete: boolean;
  onNext: () => void;
  onClose: () => void;
}) {
  const [ai, setAi] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [aiOutput, setAiOutput] = useState("");

  const runReview = async () => {
    setAi("loading");
    setAiOutput("");
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, exerciseId, level, solution: solutionCode, readme }),
      });
      const data = await res.json();
      if (data.ok) {
        setAiOutput(data.output || "(no output)");
        setAi("done");
      } else {
        setAiOutput(data.error || "Review failed");
        setAi("error");
      }
    } catch {
      setAi("error");
      setAiOutput("Couldn't reach the review server. AI review needs `npm run web` (dev) with an agent CLI configured.");
    }
  };

  return (
    <aside className="insights-panel">
      <div className="insights-head">
        <strong>{complete ? "🎉 Exercise complete!" : `Level ${level} submitted ✓`}</strong>
        <button className="insights-close" aria-label="close insights" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="insights-body">
        <div className="insights-stats">
          <Stat label="Time" value={fmtTime(stat?.timeMs ?? 0)} />
          <Stat label="Runs" value={String(stat?.attempts ?? 0)} />
          {stat?.complexity && <Stat label="Complexity" value={stat.complexity} />}
          {stat?.optimal !== undefined && (
            <Stat label="Optimal" value={stat.optimal ? "✓ yes" : "could be faster"} />
          )}
        </div>

        <div className="insights-ai">
          <div className="insights-ai-head">
            <span>AI review</span>
            <button className="run-btn" disabled={ai === "loading"} onClick={runReview}>
              {ai === "loading" ? "Running…" : "Run codex"}
            </button>
          </div>
          {ai !== "idle" && (
            <pre className={`insights-ai-out ${ai}`}>
              {ai === "loading" ? "Asking the agent — this can take a bit…" : aiOutput}
            </pre>
          )}
          {ai === "idle" && <p className="muted insights-ai-hint">On-demand: review complexity & quality, get directional hints.</p>}
        </div>
      </div>

      <div className="insights-foot">
        {!complete && level < totalLevels && (
          <button className="submit ready" onClick={onNext}>
            Next level →
          </button>
        )}
        <button className="run-btn" onClick={onClose}>
          Keep editing
        </button>
      </div>
    </aside>
  );
}
