import { useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import type { ExerciseMeta } from "../../catalog";
import type { ExerciseFiles } from "./manifest";
import { CodeEditor } from "./Editor";
import { Markdown } from "./Markdown";
import { TestPanel } from "./TestPanel";
import { PreviewPanel } from "./PreviewPanel";

export function Workspace({
  categoryId,
  exercise,
  files,
  level,
  onLevel,
}: {
  categoryId: string;
  exercise: ExerciseMeta;
  files: ExerciseFiles;
  level: number;
  onLevel: (level: number) => void;
}) {
  const hasPreview = categoryId === "react";
  const [code, setCode] = useState(files.solutionCode);
  const [tab, setTab] = useState<"tests" | "preview">(hasPreview ? "preview" : "tests");

  return (
    <div className="ws">
      <div className="ws-head">
        <h1>
          {exercise.id} — {exercise.name}
        </h1>
        <div className="dots">
          {Array.from({ length: exercise.levels }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              className={`dot ${n === level ? "active" : ""}`}
              onClick={() => onLevel(n)}
              title={`Level ${n}`}
            >
              {n}
            </button>
          ))}
          <button className="reset" title="Reset to starter code" onClick={() => setCode(files.solutionCode)}>
            reset
          </button>
        </div>
      </div>

      <PanelGroup direction="horizontal" className="ws-panels" autoSaveId={`ws-${categoryId}`}>
        <Panel defaultSize={32} minSize={16} className="panel">
          <div className="panel-head">README</div>
          <div className="panel-body scroll">
            <Markdown source={files.readme} />
          </div>
        </Panel>

        <PanelResizeHandle className="rhandle" />

        <Panel minSize={30} className="panel">
          <PanelGroup direction="vertical" className="results-group">
            <Panel defaultSize={60} minSize={20} className="panel">
              <div className="panel-head mono">{files.solutionPath}</div>
              <div className="panel-body">
                <CodeEditor path={files.solutionPath} value={code} onChange={setCode} />
              </div>
            </Panel>

            <PanelResizeHandle className="rhandle vertical" />

            <Panel minSize={15} className="panel">
              <div className="panel-head tabs">
                {hasPreview && (
                  <button
                    className={`tab ${tab === "preview" ? "active" : ""}`}
                    onClick={() => setTab("preview")}
                  >
                    Preview
                  </button>
                )}
                <button
                  className={`tab ${tab === "tests" ? "active" : ""}`}
                  onClick={() => setTab("tests")}
                >
                  Tests
                </button>
              </div>
              <div className="panel-body">
                {hasPreview && (
                  <div className="fill scroll" style={{ display: tab === "preview" ? "block" : "none" }}>
                    {files.previewCode && (
                      <PreviewPanel previewCode={files.previewCode} solutionCode={code} />
                    )}
                  </div>
                )}
                <div className="fill scroll" style={{ display: tab === "tests" ? "block" : "none" }}>
                  <TestPanel testCode={files.testCode} solutionCode={code} level={level} />
                </div>
              </div>
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
}
