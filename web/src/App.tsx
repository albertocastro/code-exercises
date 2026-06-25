import { useMemo, useState, type ReactNode } from "react";
import { CATALOG } from "../../catalog";
import { loadExercise } from "./manifest";
import { Workspace } from "./Workspace";
import { allProgress, getExercise, resetAll } from "./progress";
import { fmtTime } from "./useTimer";

type View =
  | { kind: "categories" }
  | { kind: "insights" }
  | { kind: "exercises"; categoryId: string }
  | { kind: "workspace"; categoryId: string; exerciseId: string; level: number };

export function App() {
  const [view, setView] = useState<View>({ kind: "categories" });

  if (view.kind === "categories") {
    return (
      <Shell action={{ label: "Insights", onClick: () => setView({ kind: "insights" }) }}>
        <h1>code-exercises</h1>
        <p className="muted">Pick a category.</p>
        <div className="grid">
          {CATALOG.map((cat) => (
            <button
              key={cat.id}
              className="card"
              onClick={() => setView({ kind: "exercises", categoryId: cat.id })}
            >
              <span className="card-id">{cat.id}</span>
              <span className="card-name">{cat.name}</span>
              <span className="muted">{cat.exercises.length} exercises</span>
            </button>
          ))}
        </div>
      </Shell>
    );
  }

  if (view.kind === "insights") {
    return <Insights onBack={() => setView({ kind: "categories" })} />;
  }

  if (view.kind === "exercises") {
    const cat = CATALOG.find((c) => c.id === view.categoryId)!;
    return (
      <Shell onBack={() => setView({ kind: "categories" })}>
        <h1>{cat.name}</h1>
        <div className="list">
          {cat.exercises.map((ex) => {
            const p = getExercise(`${cat.id}/${ex.id}`);
            const done = Object.values(p.levels).filter((l) => l.submittedAt).length;
            return (
              <button
                key={ex.id}
                className="row"
                onClick={() =>
                  setView({
                    kind: "workspace",
                    categoryId: cat.id,
                    exerciseId: ex.id,
                    level: Math.min(p.unlockedLevel, ex.levels),
                  })
                }
              >
                <span className="row-id">{ex.id}</span>
                <span className="row-name">{ex.name}</span>
                <span className={`badge ${done === ex.levels ? "complete" : ""}`}>
                  {done}/{ex.levels}
                </span>
              </button>
            );
          })}
        </div>
      </Shell>
    );
  }

  return <WorkspaceView view={view} setView={setView} />;
}

function WorkspaceView({
  view,
  setView,
}: {
  view: { categoryId: string; exerciseId: string; level: number };
  setView: (v: View) => void;
}) {
  const cat = CATALOG.find((c) => c.id === view.categoryId)!;
  const ex = cat.exercises.find((e) => e.id === view.exerciseId)!;
  const files = useMemo(
    () => loadExercise(view.categoryId, view.exerciseId),
    [view.categoryId, view.exerciseId]
  );

  return (
    <Shell fluid onBack={() => setView({ kind: "exercises", categoryId: view.categoryId })}>
      <Workspace
        key={`${view.categoryId}/${view.exerciseId}`}
        categoryId={view.categoryId}
        exercise={ex}
        files={files}
        level={view.level}
        onLevel={(level) =>
          setView({
            kind: "workspace",
            categoryId: view.categoryId,
            exerciseId: view.exerciseId,
            level,
          })
        }
      />
    </Shell>
  );
}

function Insights({ onBack }: { onBack: () => void }) {
  const [, force] = useState(0);
  const data = allProgress();

  let totalTime = 0;
  let totalDone = 0;
  let totalLevels = 0;
  let totalAttempts = 0;

  const rows = CATALOG.flatMap((cat) =>
    cat.exercises.map((ex) => {
      const p = data[`${cat.id}/${ex.id}`];
      const levels = p?.levels ?? {};
      const done = Object.values(levels).filter((l) => l.submittedAt).length;
      const time = Object.values(levels).reduce((s, l) => s + (l.timeMs || 0), 0);
      const attempts = Object.values(levels).reduce((s, l) => s + (l.attempts || 0), 0);
      totalTime += time;
      totalDone += done;
      totalLevels += ex.levels;
      totalAttempts += attempts;
      return { cat: cat.id, id: ex.id, name: ex.name, done, levels: ex.levels, time, attempts };
    })
  );

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "code-exercises-metrics.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Shell onBack={onBack}>
      <div className="insights-head">
        <h1>Insights</h1>
        <div className="insights-actions">
          <button className="back" onClick={exportJson}>
            Export JSON
          </button>
          <button
            className="back danger"
            onClick={() => {
              if (confirm("Reset all progress and metrics?")) {
                resetAll();
                force((n) => n + 1);
              }
            }}
          >
            Reset all
          </button>
        </div>
      </div>

      <div className="insights-summary">
        <Stat label="Levels completed" value={`${totalDone}/${totalLevels}`} />
        <Stat label="Total time" value={fmtTime(totalTime)} />
        <Stat label="Total runs" value={String(totalAttempts)} />
      </div>

      <table className="insights-table">
        <thead>
          <tr>
            <th>Exercise</th>
            <th>Levels</th>
            <th>Time</th>
            <th>Runs</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.cat}/${r.id}`} className={r.done === r.levels ? "row-complete" : ""}>
              <td>
                <span className="muted">{r.cat}</span> {r.name}
              </td>
              <td>
                {r.done}/{r.levels}
              </td>
              <td>{r.time ? fmtTime(r.time) : "—"}</td>
              <td>{r.attempts || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function Shell({
  children,
  onBack,
  fluid,
  action,
}: {
  children: ReactNode;
  onBack?: () => void;
  fluid?: boolean;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="shell">
      <nav className="topbar">
        {onBack ? (
          <button className="back" onClick={onBack}>
            ← back
          </button>
        ) : (
          <span className="brand">⌁ web-ide</span>
        )}
        {action && (
          <button className="back topbar-action" onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </nav>
      <main className={fluid ? "content-fluid" : "content"}>{children}</main>
    </div>
  );
}
