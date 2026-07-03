import { Component, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { CATALOG } from "../../catalog";
import { loadExercise } from "./manifest";
import { Workspace } from "./Workspace";
import { allProgress, getExercise, resetAll } from "./progress";
import { fmtTime } from "./useTimer";
import { getDraft } from "./drafts";
import { compilePreview } from "./runner/preview";
import { allCodeQualityScores } from "./insightsChat";

type View =
  | { kind: "categories" }
  | { kind: "insights" }
  | { kind: "progress" }
  | { kind: "exercises"; categoryId: string }
  | { kind: "workspace"; categoryId: string; exerciseId: string; level: number };

function parseStandalonePreview() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts[0] !== "preview" || parts.length !== 3) {
    return null;
  }

  const category = CATALOG.find((entry) => entry.id === parts[1]);
  if (!category || !category.preview) {
    return null;
  }

  const exercise = category.exercises.find((entry) => entry.id === parts[2]);
  if (!exercise) {
    return null;
  }

  return {
    categoryId: category.id,
    exerciseId: exercise.id,
    exerciseName: exercise.name,
  };
}

function parseViewFromUrl(): View {
  const url = new URL(window.location.href);
  const parts = url.pathname.split("/").filter(Boolean);

  if (parts[0] === "insights") {
    return { kind: "insights" };
  }

  if (parts[0] === "progress") {
    return { kind: "progress" };
  }

  if (parts.length >= 1) {
    const category = CATALOG.find((entry) => entry.id === parts[0]);
    if (!category) {
      return { kind: "categories" };
    }

    if (parts.length === 1) {
      return { kind: "exercises", categoryId: category.id };
    }

    const exercise = category.exercises.find((entry) => entry.id === parts[1]);
    if (!exercise) {
      return { kind: "exercises", categoryId: category.id };
    }

    const rawLevel = Number(url.searchParams.get("level"));
    const progress = getExercise(`${category.id}/${exercise.id}`);
    const defaultLevel = Math.min(progress.unlockedLevel, exercise.levels);
    const level = Number.isInteger(rawLevel)
      ? Math.max(1, Math.min(rawLevel, exercise.levels))
      : defaultLevel;

    return {
      kind: "workspace",
      categoryId: category.id,
      exerciseId: exercise.id,
      level,
    };
  }

  return { kind: "categories" };
}

function urlForView(view: View): string {
  switch (view.kind) {
    case "categories":
      return "/";
    case "insights":
      return "/insights";
    case "progress":
      return "/progress";
    case "exercises":
      return `/${view.categoryId}`;
    case "workspace":
      return `/${view.categoryId}/${view.exerciseId}?level=${view.level}`;
  }
}

export function App() {
  const standalonePreview = parseStandalonePreview();
  if (standalonePreview) {
    return <StandalonePreviewPage {...standalonePreview} />;
  }

  const [view, setView] = useState<View>(() => parseViewFromUrl());

  useEffect(() => {
    const syncView = () => setView(parseViewFromUrl());
    window.addEventListener("popstate", syncView);
    return () => window.removeEventListener("popstate", syncView);
  }, []);

  useEffect(() => {
    const nextUrl = urlForView(view);
    const current = `${window.location.pathname}${window.location.search}`;
    if (current !== nextUrl) {
      window.history.pushState({}, "", nextUrl);
    }
  }, [view]);

  if (view.kind === "categories") {
    return (
      <Shell
        actions={[
          { label: "Progress", onClick: () => setView({ kind: "progress" }) },
          { label: "Insights", onClick: () => setView({ kind: "insights" }) },
        ]}
      >
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

  if (view.kind === "progress") {
    return <ProgressPage onBack={() => setView({ kind: "categories" })} onRetry={setView} />;
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
                <span className="row-copy">
                  <span className="row-name">
                    {ex.name}
                    <span className={`difficulty-tag ${ex.difficulty}`}>{ex.difficulty}</span>
                  </span>
                  {ex.topic && <span className="row-topic">{ex.topic}</span>}
                </span>
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

function errorToString(error: unknown): string {
  if (error instanceof Error) return error.stack || error.message;
  return String(error);
}

class StandalonePreviewErrorBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    return { error: errorToString(error) };
  }

  render() {
    if (this.state.error) {
      return <pre className="run-error">{this.state.error}</pre>;
    }
    return this.props.children;
  }
}

function StandalonePreviewPage({
  categoryId,
  exerciseId,
  exerciseName,
}: {
  categoryId: string;
  exerciseId: string;
  exerciseName: string;
}) {
  const files = useMemo(() => loadExercise(categoryId, exerciseId), [categoryId, exerciseId]);
  const draftKey = `${categoryId}/${exerciseId}`;
  const solutionCode = getDraft(draftKey) ?? files.solutionCode;
  const previewCode = getDraft(draftKey, "preview") ?? files.previewCode ?? "";
  const [Demo, setDemo] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = `${exerciseName} — Preview`;
  }, [exerciseName]);

  useEffect(() => {
    try {
      const compiled = compilePreview(previewCode, solutionCode);
      setDemo(() => compiled);
      setError(null);
    } catch (nextError) {
      setDemo(null);
      setError(errorToString(nextError));
    }
  }, [previewCode, solutionCode]);

  if (error) {
    return <pre className="run-error">{error}</pre>;
  }

  return (
    <div className="preview-host">
      {Demo ? (
        <StandalonePreviewErrorBoundary>
          <Demo />
        </StandalonePreviewErrorBoundary>
      ) : null}
    </div>
  );
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

function ProgressPage({
  onBack,
  onRetry,
}: {
  onBack: () => void;
  onRetry: (view: View) => void;
}) {
  const progress = allProgress();
  const scores = allCodeQualityScores();

  const rows = CATALOG.flatMap((cat) =>
    cat.exercises.flatMap((ex) => {
      const progressKey = `${cat.id}/${ex.id}`;
      const stat = progress[progressKey];
      const completedLevels = Object.values(stat?.levels ?? {}).filter((level) => level.submittedAt).length;
      const score = scores[`${progressKey}/exercise`];
      if (!score && completedLevels === 0) return [];

      return [
        {
          categoryId: cat.id,
          categoryName: cat.name,
          exerciseId: ex.id,
          exerciseName: ex.name,
          topic: ex.topic,
          levels: ex.levels,
          completedLevels,
          score: score?.score ?? null,
          scoredAt: score?.createdAt ?? null,
          needsRetry: typeof score?.score === "number" && score.score < 90,
        },
      ];
    })
  ).sort((a, b) => {
    const aTime = a.scoredAt ?? 0;
    const bTime = b.scoredAt ?? 0;
    if (aTime !== bTime) return bTime - aTime;
    return a.exerciseId.localeCompare(b.exerciseId);
  });

  const scoredCount = rows.filter((row) => row.score !== null).length;
  const retryCount = rows.filter((row) => row.needsRetry).length;
  const averageScore =
    scoredCount > 0
      ? Math.round(rows.filter((row) => row.score !== null).reduce((sum, row) => sum + (row.score ?? 0), 0) / scoredCount)
      : null;

  return (
    <Shell onBack={onBack}>
      <div className="progress-hero">
        <div>
          <h1>Keep going</h1>
          <p className="progress-copy">
            This page should feel like momentum, not judgment. A score under 90 is just a clear next rep, not a setback.
          </p>
        </div>
        <div className="progress-summary">
          <Stat label="Exercises touched" value={String(rows.length)} />
          <Stat label="Scored finishes" value={String(scoredCount)} />
          <Stat label="Avg score" value={averageScore === null ? "—" : `${averageScore}`} />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="progress-empty">
          <strong>No exercise history yet.</strong>
          <p className="muted">Submit a level or finish an exercise and it will show up here.</p>
        </div>
      ) : (
        <>
          {retryCount > 0 && (
            <div className="progress-banner">
              <strong>{retryCount} exercise{retryCount === 1 ? "" : "s"} ready for another pass.</strong>
              <span>That is progress you can compound, not progress you lost.</span>
            </div>
          )}
          <div className="progress-list">
            {rows.map((row) => (
              <article key={`${row.categoryId}/${row.exerciseId}`} className="progress-card">
                <div className="progress-card-head">
                  <div>
                    <span className="progress-category">{row.categoryId}</span>
                    <h2>
                      {row.exerciseId} · {row.exerciseName}
                    </h2>
                    <p className="progress-topic">{row.topic || row.categoryName}</p>
                  </div>
                  <div className={`progress-score ${row.score !== null && row.score >= 90 ? "strong" : "growing"}`}>
                    <span>Score</span>
                    <strong>{row.score === null ? "Pending" : row.score}</strong>
                  </div>
                </div>

                <div className="progress-meta">
                  <span>
                    Levels: {row.completedLevels}/{row.levels}
                  </span>
                  <span>
                    {row.score === null
                      ? "Finish the exercise to unlock a quality score."
                      : row.score >= 90
                        ? "Strong work. Keep that standard."
                        : "You are close. One more focused pass can lift this comfortably."}
                  </span>
                </div>

                {row.needsRetry && (
                  <div className="progress-actions">
                    <button
                      className="progress-retry"
                      onClick={() =>
                        onRetry({
                          kind: "workspace",
                          categoryId: row.categoryId,
                          exerciseId: row.exerciseId,
                          level: row.levels,
                        })
                      }
                    >
                      Retry for 90+
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </Shell>
  );
}

function Shell({
  children,
  onBack,
  fluid,
  actions,
}: {
  children: ReactNode;
  onBack?: () => void;
  fluid?: boolean;
  actions?: { label: string; onClick: () => void }[];
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
        {actions && (
          <div className="topbar-actions">
            {actions.map((action) => (
              <button key={action.label} className="back topbar-action" onClick={action.onClick}>
                {action.label}
              </button>
            ))}
          </div>
        )}
      </nav>
      <main className={fluid ? "content-fluid" : "content"}>{children}</main>
    </div>
  );
}
