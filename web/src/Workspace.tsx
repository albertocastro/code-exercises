import { useEffect, useRef, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import type { ExerciseMeta } from "../../catalog";
import type { ExerciseFiles } from "./manifest";
import { CodeEditor } from "./Editor";
import { Markdown } from "./Markdown";
import { TestPanel } from "./TestPanel";
import { PreviewPanel } from "./PreviewPanel";
import { ConsolePanel } from "./ConsolePanel";
import { Explorer, type FileEntry } from "./Explorer";
import { InsightsPanel } from "./InsightsPanel";
import { celebrate } from "./confetti";
import { getDraft, saveDraft, clearDraft } from "./drafts";
import {
  getExercise,
  recordAttempt,
  markPassed,
  submitLevel,
  resetExercise,
  type ExerciseProgress,
} from "./progress";
import { useTimer, fmtTime } from "./useTimer";
import { runComplexity, type ComplexityResult } from "./runner/complexity";
import type { RunResult } from "./runner/testRunner";
import type { ConsoleEntry, ConsoleSink } from "./runner/consoleCapture";

type Layout = "split" | "columns";
type DiagnosticsTab = "preview" | "tests" | "console";
type DiagnosticsLayout = "single" | "split";
const LAYOUT_KEY = "code-exercises-layout";
const EXECUTION_DEBOUNCE_MS = 800;

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
  const [executionCode, setExecutionCode] = useState(code);
  const [activeFile, setActiveFile] = useState("solution");
  const [tab, setTab] = useState<DiagnosticsTab>(hasPreview ? "preview" : "tests");
  const [diagnosticsLayout, setDiagnosticsLayout] = useState<DiagnosticsLayout>("single");
  const [explorerCollapsed, setExplorerCollapsed] = useState(false);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [prog, setProg] = useState<ExerciseProgress>(() => getExercise(key));
  const [green, setGreen] = useState(false);
  const [hint, setHint] = useState<ComplexityResult | null>(null);
  const [insightsLevel, setInsightsLevel] = useState<number | null>(null);
  const [layout, setLayout] = useState<Layout>(
    () => (localStorage.getItem(LAYOUT_KEY) as Layout) || "split"
  );
  const timer = useTimer();
  const nextConsoleId = useRef(1);

  const submitted = !!prog.levels[level]?.submittedAt;
  const unlocked = prog.unlockedLevel;
  const executionPending = code !== executionCode;
  const canSubmit = green && !submitted && !executionPending;
  const complete = prog.unlockedLevel > exercise.levels;
  const completedStats = Object.values(prog.levels).filter((stat) => stat.submittedAt);
  const completedTime = completedStats.reduce((sum, stat) => sum + (stat.timeMs || 0), 0);
  const completedAttempts = completedStats.reduce((sum, stat) => sum + (stat.attempts || 0), 0);

  useEffect(() => {
    setGreen(false);
    setConsoleEntries([]);
    setInsightsLevel(null);
    timer.setElapsed(0);
    if (submitted) timer.stop();
    else timer.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, exercise.id]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setConsoleEntries([]);
      setExecutionCode(code);
    }, EXECUTION_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [code]);

  // Editing invalidates the last complexity verdict and is persisted.
  const editCode = (next: string) => {
    setCode(next);
    setGreen(false);
    setHint(null);
    saveDraft(key, next);
  };
  const resetCode = () => {
    clearDraft(key);
    setCode(files.solutionCode);
    setGreen(false);
    setHint(null);
  };
  const resetWholeExercise = () => {
    if (!confirm("Reset this exercise? This deletes its draft and progress, then returns to level 1.")) {
      return;
    }

    clearDraft(key);
    setCode(files.solutionCode);
    setExecutionCode(files.solutionCode);
    setProg(resetExercise(key));
    setGreen(false);
    setHint(null);
    setConsoleEntries([]);
    timer.setElapsed(0);
    timer.start();
    onLevel(1);
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
  const onConsole: ConsoleSink = (entry) => {
    // Cap entries: a solution that logs during render would otherwise drive an
    // unbounded re-render loop (logging spam) and freeze the IDE. Returning the
    // same array once full makes React bail out and breaks the cycle.
    setConsoleEntries((prev) =>
      prev.length >= 500 ? prev : [...prev, { ...entry, id: nextConsoleId.current++ }]
    );
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
    // Don't auto-advance: celebrate and open the insights panel instead.
    celebrate(level === exercise.levels);
    setInsightsLevel(level);
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
    <TestPanel
      testCode={files.testCode}
      solutionCode={executionCode}
      level={level}
      onResult={onResult}
      onConsole={onConsole}
    />
  );
  const previewContent = files.previewCode ? (
    <PreviewPanel
      previewCode={files.previewCode}
      solutionCode={executionCode}
      onConsole={onConsole}
    />
  ) : null;
  const consoleContent = (
    <ConsolePanel entries={consoleEntries} onClear={() => setConsoleEntries([])} />
  );
  const diagnosticsPanel = (includePreview: boolean) => {
    const activeTab = includePreview || tab !== "preview" ? tab : "tests";
    const body =
      diagnosticsLayout === "split" ? (
        <div className="diagnostics-split">
          <div className="diagnostics-pane">{testsContent}</div>
          <div className="diagnostics-pane console-side">{consoleContent}</div>
        </div>
      ) : (
        <>
          {includePreview && hasPreview && activeTab === "preview" && previewContent}
          {activeTab === "tests" && testsContent}
          {activeTab === "console" && consoleContent}
        </>
      );

    return (
      <>
        <div className="panel-head tabs">
          {includePreview && hasPreview && (
            <button className={`tab ${activeTab === "preview" ? "active" : ""}`} onClick={() => setTab("preview")}>
              Preview
            </button>
          )}
          <button className={`tab ${activeTab === "tests" ? "active" : ""}`} onClick={() => setTab("tests")}>
            Tests
          </button>
          <button className={`tab ${activeTab === "console" ? "active" : ""}`} onClick={() => setTab("console")}>
            Console
          </button>
          <button
            className={`tab tab-tool ${diagnosticsLayout === "split" ? "active" : ""}`}
            onClick={() => {
              setDiagnosticsLayout((mode) => {
                const next = mode === "split" ? "single" : "split";
                if (next === "split") setTab("tests");
                return next;
              });
            }}
            title="Toggle Tests + Console side by side"
          >
            {diagnosticsLayout === "split" ? "Single" : "Side by side"}
          </button>
        </div>
        <div className="panel-body">
          <div className="fill scroll">{body}</div>
        </div>
      </>
    );
  };

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
            <button className="timer-btn" title="Reset timer" onClick={timer.reset}>
              ↺
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

          <button className="reset" title="Reset code to starter" onClick={resetCode}>
            reset code
          </button>

          <button className="reset danger" title="Delete draft and progress for this exercise" onClick={resetWholeExercise}>
            reset exercise
          </button>
        </div>
      </div>

      {(hint || complete) && (
        <div className="banner-row">
          {complete && (
            <div className="exercise-insights">
              <span className="banner done">All {exercise.levels} levels complete</span>
              <span>Total time: {fmtTime(completedTime)}</span>
              <span>Runs: {completedAttempts || "0"}</span>
              <span>Avg / level: {fmtTime(exercise.levels ? completedTime / exercise.levels : 0)}</span>
            </div>
          )}
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
        <Explorer
          files={fileEntries}
          active={activeFile}
          collapsed={explorerCollapsed}
          onToggle={() => setExplorerCollapsed((value) => !value)}
          onSelect={setActiveFile}
        />
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
	                {diagnosticsPanel(true)}
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
	                  {diagnosticsPanel(false)}
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
              diagnosticsPanel(false)
            )}
          </Panel>
        </PanelGroup>
      )}
        </div>
      </div>

      {insightsLevel !== null && (
        <InsightsPanel
          categoryId={categoryId}
          exerciseId={exercise.id}
          level={insightsLevel}
          totalLevels={exercise.levels}
          solutionCode={code}
          readme={files.readme}
          stat={prog.levels[insightsLevel]}
          complete={prog.unlockedLevel > exercise.levels}
          onNext={() => {
            const next = insightsLevel + 1;
            setInsightsLevel(null);
            if (next <= exercise.levels) onLevel(next);
          }}
          onClose={() => setInsightsLevel(null)}
        />
      )}
    </div>
  );
}
