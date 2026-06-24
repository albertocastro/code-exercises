import { useMemo, useState, type ReactNode } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { CATALOG } from "../../catalog";
import { loadExercise } from "./manifest";
import { CodeEditor } from "./Editor";
import { Markdown } from "./Markdown";

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
      key={`${view.categoryId}/${view.exerciseId}`}
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
  const [code, setCode] = useState(files.solutionCode);

  return (
    <Shell fluid onBack={() => onBack(view.categoryId)}>
      <div className="ws">
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
            <button
              className="reset"
              title="Reset to starter code"
              onClick={() => setCode(files.solutionCode)}
            >
              reset
            </button>
          </div>
        </div>

        <PanelGroup direction="horizontal" className="ws-panels" autoSaveId={`ws-${cat.id}`}>
          <Panel defaultSize={38} minSize={18} className="panel">
            <div className="panel-head">README</div>
            <div className="panel-body scroll">
              <Markdown source={files.readme} />
            </div>
          </Panel>

          <PanelResizeHandle className="rhandle" />

          <Panel minSize={30} className="panel">
            <div className="panel-head mono">{files.solutionPath}</div>
            <div className="panel-body">
              <CodeEditor path={files.solutionPath} value={code} onChange={setCode} />
            </div>
          </Panel>
        </PanelGroup>
      </div>
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
