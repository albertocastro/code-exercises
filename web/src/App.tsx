import { useMemo, useState, type ReactNode } from "react";
import { CATALOG } from "../../catalog";
import { loadExercise } from "./manifest";
import { Workspace } from "./Workspace";

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
  // Stable per-exercise identity so Sandpack isn't reinitialised on level change.
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

function Shell({
  children,
  onBack,
  fluid,
}: {
  children: ReactNode;
  onBack?: () => void;
  fluid?: boolean;
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
      </nav>
      <main className={fluid ? "content-fluid" : "content"}>{children}</main>
    </div>
  );
}
