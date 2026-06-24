import { useMemo, useState, type ReactNode } from "react";
import { CATALOG } from "../../catalog";
import { loadExercise } from "./manifest";

type View =
  | { kind: "categories" }
  | { kind: "exercises"; categoryId: string }
  | { kind: "workspace"; categoryId: string; exerciseId: string; level: number };

export function App() {
  const [view, setView] = useState<View>({ kind: "categories" });

  if (view.kind === "categories") {
    return (
      <Shell>
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

  if (view.kind === "exercises") {
    const cat = CATALOG.find((c) => c.id === view.categoryId)!;
    return (
      <Shell onBack={() => setView({ kind: "categories" })}>
        <h1>{cat.name}</h1>
        <div className="list">
          {cat.exercises.map((ex) => (
            <button
              key={ex.id}
              className="row"
              onClick={() =>
                setView({
                  kind: "workspace",
                  categoryId: cat.id,
                  exerciseId: ex.id,
                  level: 1,
                })
              }
            >
              <span className="row-id">{ex.id}</span>
              <span className="row-name">{ex.name}</span>
              <span className="muted">{ex.levels} levels</span>
            </button>
          ))}
        </div>
      </Shell>
    );
  }

  return (
    <Workspace
      view={view}
      onBack={(categoryId) => setView({ kind: "exercises", categoryId })}
      onLevel={(level) => setView({ ...view, level })}
    />
  );
}

function Workspace({
  view,
  onBack,
  onLevel,
}: {
  view: { categoryId: string; exerciseId: string; level: number };
  onBack: (categoryId: string) => void;
  onLevel: (level: number) => void;
}) {
  const cat = CATALOG.find((c) => c.id === view.categoryId)!;
  const ex = cat.exercises.find((e) => e.id === view.exerciseId)!;
  const files = useMemo(
    () => loadExercise(view.categoryId, view.exerciseId),
    [view.categoryId, view.exerciseId]
  );

  return (
    <Shell onBack={() => onBack(view.categoryId)}>
      <div className="ws-head">
        <h1>
          {ex.id} — {ex.name}
        </h1>
        <div className="dots">
          {Array.from({ length: ex.levels }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              className={`dot ${n === view.level ? "active" : ""}`}
              onClick={() => onLevel(n)}
              title={`Level ${n}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="ws-grid">
        <section className="pane">
          <header>README</header>
          <pre className="readme">{files.readme}</pre>
        </section>
        <section className="pane">
          <header>{files.solutionPath}</header>
          <pre className="code">{files.solutionCode}</pre>
        </section>
      </div>
      <p className="muted">
        Phase 0–1 ✓ — navigation + file loading. Monaco editor, live preview, and
        in-browser tests land in the next phases.
      </p>
    </Shell>
  );
}

function Shell({ children, onBack }: { children: ReactNode; onBack?: () => void }) {
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
      </nav>
      <main className="content">{children}</main>
    </div>
  );
}
