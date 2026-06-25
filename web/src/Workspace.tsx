import { useEffect, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import type { ExerciseMeta } from "../../catalog";
import type { ExerciseFiles } from "./manifest";
import { CodeEditor } from "./Editor";
import { Markdown } from "./Markdown";
import { TestPanel } from "./TestPanel";
import { PreviewPanel } from "./PreviewPanel";
import { Explorer, type FileEntry } from "./Explorer";
import { getDraft, saveDraft, clearDraft } from "./drafts";
import {
  getExercise,
  recordAttempt,
  markPassed,
  submitLevel,
  type ExerciseProgress,
} from "./progress";
import { useTimer, fmtTime } from "./useTimer";
import { runComplexity, type ComplexityResult } from "./runner/complexity";
import type { RunResult } from "./runner/testRunner";

type Layout = "split" | "columns";
const LAYOUT_KEY = "code-exercises-layout";

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
  const hasPreview = categoryId === "react" && !!files.previewCode;
  const key = `${categoryId}/${exercise.id}`;
  const [code, setCode] = useState(() => getDraft(key) ?? files.solutionCode);
  const [activeFile, setActiveFile] = useState("solution");
  const [tab, setTab] = useState<"tests" | "preview">(hasPreview ? "preview" : "tests");
  const [prog, setProg] = useState<ExerciseProgress>(() => getExercise(key));
  const [green, setGreen] = useState(false);
  const [hint, setHint] = useState<ComplexityResult | null>(null);
  const [layout, setLayout] = useState<Layout>(
    () => (localStorage.getItem(LAYOUT_KEY) as Layout) || "split"
  );
  const timer = useTimer();

  const submitted = !!prog.levels[level]?.submittedAt;
  const unlocked = prog.unlockedLevel;
  const canSubmit = green && !submitted;
  const complete = prog.unlockedLevel > exercise.levels;

  useEffect(() => {
    setGreen(false);
    timer.setElapsed(0);
    if (submitted) timer.stop();
    else timer.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, exercise.id]);

  // Editing invalidates the last complexity verdict and is persisted.
  const editCode = (next: string) => {
    setCode(next);
    setHint(null);
    saveDraft(key, next);
  };
  const resetCode = () => {
    clearDraft(key);
    setCode(files.solutionCode);
    setHint(null);
  };

  const chooseLayout = (l: Layout) => {
    setLayout(l);
    localStorage.setItem(LAYOUT_KEY, l);
  };

  const onResult = (r: RunResult) => {
    setProg(recordAttempt(key, level));
    const isGreen = r.failed === 0 && r.passed > 0 && !r.compileError;
    setGreen(isGreen);
    if (isGreen) {
      timer.stop();
      setProg(markPassed(key, level));
    }
  };

  const submit = () => {
    // Tier-1 complexity check (if the exercise ships perf.ts).
    let extra: { optimal?: boolean; complexity?: string } | undefined;
    if (files.perfCode) {
      const c = runComplexity(files.perfCode, code);
      if (c.ran) {
        setHint(c);
        extra = { optimal: c.optimal, complexity: c.measured };
      }
    }
    setProg(submitLevel(key, level, timer.elapsed, exercise.levels, extra));
    if (level < exercise.levels) onLevel(level + 1);
  };

  // ── reusable panel bodies ──
  const readmeBody = (
    <>
      <div className="panel-head">README</div>
      <div className="panel-body scroll">
        <Markdown source={files.readme} />
      </div>
    </>
  );
  // Active file in the editor pane (solution is editable; the rest are read-only,
  // so you can inspect the tests / preview / perf spec while you debug).
  const openFiles: Record<string, { path: string; code: string; ro: boolean }> = {
    solution: { path: files.solutionPath, code, ro: false },
    test: { path: files.testPath, code: files.testCode, ro: true },
  };
  if (files.previewCode) openFiles.preview = { path: "/preview.tsx", code: files.previewCode, ro: true };
  if (files.perfCode) openFiles.perf = { path: "/perf.ts", code: files.perfCode, ro: true };
  const af = openFiles[activeFile] ?? openFiles.solution;

  const fileEntries: FileEntry[] = [
    { id: "solution", name: files.solutionPath.slice(1), readOnly: false },
    { id: "test", name: files.testPath.slice(1), readOnly: true },
    ...(files.previewCode ? [{ id: "preview", name: "preview.tsx", readOnly: true }] : []),
    ...(files.perfCode ? [{ id: "perf", name: "perf.ts", readOnly: true }] : []),
  ];

  const editorBody = (
    <>
      <div className="panel-head mono">
        {af.path}
        {af.ro && <span className="ro-tag">read-only</span>}
      </div>
      <div className="panel-body">
        <CodeEditor path={af.path} value={af.code} onChange={editCode} readOnly={af.ro} />
      </div>
    </>
  );
  const testsContent = (
    <TestPanel testCode={files.testCode} solutionCode={code} level={level} onResult={onResult} />
  );
  const previewContent = files.previewCode ? (
    <PreviewPanel previewCode={files.previewCode} solutionCode={code} />
  ) : null;

  return (
    <div className="ws">
      <div className="ws-head">
        <h1>
          {exercise.id} — {exercise.name}
        </h1>

        <div className="ws-controls">
          <div className="layout-switch" title="Layout">
            <button
              className={`lbtn ${layout === "split" ? "active" : ""}`}
              onClick={() => chooseLayout("split")}
              title="Split"
            >
              ▣
            </button>
            <button
              className={`lbtn ${layout === "columns" ? "active" : ""}`}
              onClick={() => chooseLayout("columns")}
              title="Columns: README | code+tests | preview"
            >
              ☰
            </button>
          </div>

          <div className={`timer ${timer.running ? "running" : ""}`}>
            <span className="time">{fmtTime(timer.elapsed)}</span>
            <button
              className="timer-btn"
              title={timer.running ? "Pause" : "Start"}
              onClick={timer.running ? timer.stop : timer.start}
            >
              {timer.running ? "⏸" : "▶"}
            </button>
          </div>

          <div className="dots">
            {Array.from({ length: exercise.levels }, (_, i) => i + 1).map((n) => {
              const locked = n > unlocked;
              const done = !!prog.levels[n]?.submittedAt;
              return (
                <button
                  key={n}
                  className={`dot ${n === level ? "active" : ""} ${done ? "done" : ""} ${locked ? "locked" : ""}`}
                  disabled={locked}
                  onClick={() => !locked && onLevel(n)}
                  title={locked ? "Locked — submit the previous level" : `Level ${n}`}
                >
                  {locked ? "🔒" : done ? "✓" : n}
                </button>
              );
            })}
          </div>

          <button
            className={`submit ${canSubmit ? "ready" : ""}`}
            disabled={!canSubmit}
            onClick={submit}
            title={submitted ? "Already submitted" : green ? "Submit to unlock the next level" : "Pass all tests to submit"}
          >
            {submitted ? "Submitted ✓" : "Submit"}
          </button>

          <button className="reset" title="Reset to starter code" onClick={resetCode}>
            reset
          </button>
        </div>
      </div>

      {(hint || complete) && (
        <div className="banner-row">
          {complete && <span className="banner done">🎉 All {exercise.levels} levels complete!</span>}
          {hint &&
            (hint.optimal ? (
              <span className="banner ok">✓ Optimal — {hint.expected}</span>
            ) : (
              <span className="banner warn">
                ⚠ Correct, but this looks ~{hint.measured}. Aim for {hint.expected}.
              </span>
            ))}
        </div>
      )}

      <div className="ws-body">
        <Explorer files={fileEntries} active={activeFile} onSelect={setActiveFile} />
        <div className="ws-main">
      {layout === "split" ? (
        <PanelGroup direction="horizontal" className="ws-panels" autoSaveId={`ws-${categoryId}-split`}>
          <Panel defaultSize={32} minSize={16} className="panel">
            {readmeBody}
          </Panel>
          <PanelResizeHandle className="rhandle" />
          <Panel minSize={30} className="panel">
            <PanelGroup direction="vertical" className="results-group">
              <Panel defaultSize={60} minSize={20} className="panel">
                {editorBody}
              </Panel>
              <PanelResizeHandle className="rhandle vertical" />
              <Panel minSize={15} className="panel">
                <div className="panel-head tabs">
                  {hasPreview && (
                    <button className={`tab ${tab === "preview" ? "active" : ""}`} onClick={() => setTab("preview")}>
                      Preview
                    </button>
                  )}
                  <button className={`tab ${tab === "tests" ? "active" : ""}`} onClick={() => setTab("tests")}>
                    Tests
                  </button>
                </div>
                <div className="panel-body">
                  {hasPreview && (
                    <div className="fill scroll" style={{ display: tab === "preview" ? "block" : "none" }}>
                      {previewContent}
                    </div>
                  )}
                  <div className="fill scroll" style={{ display: tab === "tests" ? "block" : "none" }}>
                    {testsContent}
                  </div>
                </div>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      ) : (
        // columns: README | (code over tests) | preview   [leetcode: README | code | tests]
        <PanelGroup direction="horizontal" className="ws-panels" autoSaveId={`ws-${categoryId}-columns`}>
          <Panel defaultSize={26} minSize={14} className="panel">
            {readmeBody}
          </Panel>
          <PanelResizeHandle className="rhandle" />
          <Panel minSize={22} className="panel">
            {hasPreview ? (
              <PanelGroup direction="vertical" className="results-group">
                <Panel defaultSize={62} minSize={20} className="panel">
                  {editorBody}
                </Panel>
                <PanelResizeHandle className="rhandle vertical" />
                <Panel minSize={18} className="panel">
                  <div className="panel-head">Tests</div>
                  <div className="panel-body">
                    <div className="fill scroll">{testsContent}</div>
                  </div>
                </Panel>
              </PanelGroup>
            ) : (
              editorBody
            )}
          </Panel>
          <PanelResizeHandle className="rhandle" />
          <Panel defaultSize={hasPreview ? 30 : 34} minSize={18} className="panel">
            {hasPreview ? (
              <>
                <div className="panel-head">Preview</div>
                <div className="panel-body">
                  <div className="fill scroll">{previewContent}</div>
                </div>
              </>
            ) : (
              <>
                <div className="panel-head">Tests</div>
                <div className="panel-body">
                  <div className="fill scroll">{testsContent}</div>
                </div>
              </>
            )}
          </Panel>
        </PanelGroup>
      )}
        </div>
      </div>
    </div>
  );
}
