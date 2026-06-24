import { useEffect, useMemo, useRef, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import {
  SandpackProvider,
  SandpackPreview,
  SandpackTests,
  useActiveCode,
  useSandpack,
} from "@codesandbox/sandpack-react";
import type { ExerciseMeta } from "../../catalog";
import type { ExerciseFiles } from "./manifest";
import { buildConfig, withLevel } from "./sandpack";
import { CodeEditor } from "./Editor";
import { Markdown } from "./Markdown";

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
  // Freeze the config used to *initialise* Sandpack; later level changes are
  // applied imperatively so the learner's solution edits survive.
  const initialLevel = useRef(level).current;
  const config = useMemo(
    () => buildConfig(categoryId, files, initialLevel),
    [categoryId, files, initialLevel]
  );

  return (
    <SandpackProvider
      theme="dark"
      template={config.template}
      files={config.files}
      customSetup={{ dependencies: config.dependencies }}
      options={{ activeFile: files.solutionPath, visibleFiles: [files.solutionPath] }}
    >
      <Inner
        categoryId={categoryId}
        exercise={exercise}
        files={files}
        level={level}
        onLevel={onLevel}
        hasPreview={config.hasPreview}
      />
    </SandpackProvider>
  );
}

function Inner({
  categoryId,
  exercise,
  files,
  level,
  onLevel,
  hasPreview,
}: {
  categoryId: string;
  exercise: ExerciseMeta;
  files: ExerciseFiles;
  level: number;
  onLevel: (level: number) => void;
  hasPreview: boolean;
}) {
  const { sandpack } = useSandpack();
  const [tab, setTab] = useState<"tests" | "preview">(hasPreview ? "preview" : "tests");

  // Swap in the level-gated test file whenever the level changes.
  useEffect(() => {
    sandpack.updateFile(
      files.testPath,
      withLevel(files.testCode, level, categoryId === "react")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const reset = () => sandpack.updateFile(files.solutionPath, files.solutionCode);

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
          <button className="reset" title="Reset to starter code" onClick={reset}>
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
            <Panel defaultSize={62} minSize={20} className="panel">
              <div className="panel-head mono">{files.solutionPath}</div>
              <div className="panel-body">
                <SolutionEditor path={files.solutionPath} />
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
                {/* Keep both mounted so switching tabs doesn't restart them;
                    just hide the inactive one. */}
                {hasPreview && (
                  <div className="fill" style={{ display: tab === "preview" ? "block" : "none" }}>
                    <SandpackPreview style={{ height: "100%" }} showOpenInCodeSandbox={false} />
                  </div>
                )}
                <div className="fill" style={{ display: tab === "tests" ? "block" : "none" }}>
                  <SandpackTests verbose style={{ height: "100%" }} />
                </div>
              </div>
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
}

// Monaco bound to Sandpack's active file (the solution).
function SolutionEditor({ path }: { path: string }) {
  const { code, updateCode } = useActiveCode();
  return <CodeEditor path={path} value={code} onChange={updateCode} />;
}
