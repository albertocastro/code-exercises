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
import { InsightsPanel, StudyPlanList, ActionItemList } from "./InsightsPanel";
import { celebrate } from "./confetti";
import {
  archiveDraft,
  getDraft,
  saveDraft,
  clearDraft,
  getDraftHistory,
  type DraftFile,
  type DraftSnapshot,
} from "./drafts";
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
import { formatCode } from "./formatCode";
import {
  clearCodeQualityScore,
  getCodeQualityScore,
  hashSolution,
  saveCodeQualityScore,
  type ActionItem,
  type CodeQualityScore,
  type ScoreAnalysis,
  type StudyTopic,
} from "./insightsChat";

type Layout = "split" | "columns";
type DiagnosticsTab = "preview" | "tests" | "console";
type DiagnosticsLayout = "single" | "split";
type QualityScoreState =
  | { status: "idle" | "loading" }
  | { status: "done"; score: CodeQualityScore }
  | { status: "error"; error: string };
type QualityScoreScope = "exercise";
const LAYOUT_KEY = "code-exercises-layout";
const EXECUTION_DEBOUNCE_MS = 800;
const SELF_IMPORT_RE =
  /(?:from\s+["']|require\(\s*["'])(?:\.\/|\/)solution(?:\.[tj]sx?)?["']/;

function isCorruptSolutionDraft(draft: string, files: ExerciseFiles): boolean {
  const normalizedDraft = draft.trim();
  if (!normalizedDraft) return false;
  if (normalizedDraft === files.testCode.trim()) return true;
  if (files.previewCode && normalizedDraft === files.previewCode.trim()) return true;

  // A solution module cannot import itself in the in-browser runner. This is
  // usually a stale draft created when a read-only tab leaked into solution.tsx.
  return SELF_IMPORT_RE.test(draft);
}

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
  const [code, setCode] = useState(() => {
    const draft = getDraft(key);
    if (!draft) return files.solutionCode;
    if (!isCorruptSolutionDraft(draft, files)) return draft;

    clearDraft(key, "solution", "Recovered corrupt solution draft");
    return files.solutionCode;
  });
  const [previewCode, setPreviewCode] = useState(
    () => getDraft(key, "preview") ?? files.previewCode ?? ""
  );
  const [executionCode, setExecutionCode] = useState(code);
  const [activeFile, setActiveFile] = useState("solution");
  const [editorReveal, setEditorReveal] = useState<{ path: string; line: number; nonce: number } | null>(null);
  const [tab, setTab] = useState<DiagnosticsTab>(hasPreview ? "preview" : "tests");
  const [diagnosticsLayout, setDiagnosticsLayout] = useState<DiagnosticsLayout>("single");
  const [explorerCollapsed, setExplorerCollapsed] = useState(false);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [prog, setProg] = useState<ExerciseProgress>(() => getExercise(key));
  const [green, setGreen] = useState(false);
  const [hint, setHint] = useState<ComplexityResult | null>(null);
  const [insightsLevel, setInsightsLevel] = useState<number | null>(null);
  const [qualityScores, setQualityScores] = useState<Record<string, QualityScoreState>>({});
  const [historyFile, setHistoryFile] = useState<DraftFile | null>(null);
  const [layout, setLayout] = useState<Layout>(
    () => (localStorage.getItem(LAYOUT_KEY) as Layout) || "split"
  );
  const timer = useTimer();
  const nextConsoleId = useRef(1);

  const submitted = !!prog.levels[level]?.submittedAt;
  const unlocked = prog.unlockedLevel;
  const executionPending = code !== executionCode;
  const canSubmit = green && !executionPending;
  const complete = prog.unlockedLevel > exercise.levels;
  const completedStats = Object.values(prog.levels).filter((stat) => stat.submittedAt);
  const completedTime = completedStats.reduce((sum, stat) => sum + (stat.timeMs || 0), 0);
  const completedAttempts = completedStats.reduce((sum, stat) => sum + (stat.attempts || 0), 0);
  const submittedLevels = Object.keys(prog.levels)
    .map(Number)
    .filter((n) => !!prog.levels[n]?.submittedAt)
    .sort((a, b) => a - b);
  const finalSummaryLevel = submittedLevels.at(-1) ?? exercise.levels;

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

  const editActiveFile = (next: string) => {
    if (activeFile === "preview") {
      setPreviewCode(next);
      saveDraft(key, next, "preview");
      return;
    }
    if (activeFile !== "solution") return;

    setCode(next);
    setGreen(false);
    setHint(null);
    saveDraft(key, next);
  };
  const formatActiveFile = async () => {
    if (af.ro) return;

    try {
      const formatted = await formatCode(af.code, af.path);
      editActiveFile(formatted);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setConsoleEntries((prev) => [
        ...prev,
        {
          id: nextConsoleId.current++,
          source: "system",
          level: "error",
          args: [`Could not format ${af.path}: ${message}`],
        },
      ]);
      setTab("console");
    }
  };
  const resetCode = () => {
    clearDraft(key, "solution", "Before code reset");
    setCode(files.solutionCode);
    setGreen(false);
    setHint(null);
  };
  const resetPreview = () => {
    clearDraft(key, "preview", "Before preview reset");
    setPreviewCode(files.previewCode ?? "");
  };
  const resetWholeExercise = () => {
    if (!confirm("Reset this exercise? This deletes its draft and progress, then returns to level 1.")) {
      return;
    }

    clearDraft(key, "solution", "Before exercise reset");
    clearDraft(key, "preview", "Before exercise reset");
    setCode(files.solutionCode);
    setExecutionCode(files.solutionCode);
    setPreviewCode(files.previewCode ?? "");
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

  const restoreSnapshot = (snapshot: DraftSnapshot) => {
    if (snapshot.file === "preview") {
      archiveDraft(key, previewCode, "preview", "Before history restore");
      setPreviewCode(snapshot.code);
      saveDraft(key, snapshot.code, "preview");
      setActiveFile("preview");
    } else {
      archiveDraft(key, code, "solution", "Before history restore");
      setCode(snapshot.code);
      setGreen(false);
      setHint(null);
      saveDraft(key, snapshot.code);
      setActiveFile("solution");
    }
    setHistoryFile(null);
  };

  const openTestAt = (line?: number) => {
    setActiveFile("test");
    if (line) {
      setEditorReveal({ path: files.testPath, line, nonce: Date.now() });
    }
  };

  const onResult = (r: RunResult) => {
    setProg(recordAttempt(key, level));
    const isGreen = r.failed === 0 && r.passed > 0 && !r.compileError;
    setGreen(isGreen);
    if (isGreen) {
      timer.stop();
      setProg(markPassed(key, level));
      // Pre-warm the quality score the instant the final level passes — before the
      // user clicks Submit and opens the panel. The agent round-trip then runs in
      // the background, so the completion panel usually shows a ready score instead
      // of a spinner. ensureQualityScore dedupes by solution hash, so the Submit
      // call reuses this result when the code is unchanged.
      if (level === exercise.levels) {
        void ensureQualityScore(level, { scope: "exercise" });
      }
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
    const completesExercise = level === exercise.levels;
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
    if (completesExercise) {
      void ensureQualityScore(level, { scope: "exercise" });
    }
  };

  const openSummary = (targetLevel: number) => {
    setInsightsLevel(targetLevel);
    if (complete && targetLevel === finalSummaryLevel) {
      void ensureQualityScore(targetLevel, { scope: "exercise" });
    }
  };

  const ensureQualityScore = async (
    targetLevel: number,
    options: { scope: QualityScoreScope } = { scope: "exercise" }
  ) => {
    const scoreKey = `${key}/${options.scope}`;
    const previousScore = getCodeQualityScore(scoreKey);
    const solutionHash = hashSolution(code);
    // Reuse an existing score whenever it was generated from the exact code on
    // screen. This covers both an unchanged resubmit and the pre-warm → submit
    // hand-off (see onResult), and skips a redundant agent round-trip. When the
    // code differs, fall through and re-grade. (Toggled retake claims survive
    // via the per-item claimed merge below.)
    if (previousScore && previousScore.solutionHash === solutionHash) {
      setQualityScores((prev) => ({ ...prev, [scoreKey]: { status: "done", score: previousScore } }));
      return;
    }

    // Code differs from any cached score, so a fresh run is needed. Don't stack a
    // second request when one is already in flight for this scope.
    if (qualityScores[scoreKey]?.status === "loading") return;

    clearCodeQualityScore(scoreKey);
    setQualityScores((prev) => ({ ...prev, [scoreKey]: { status: "loading" } }));
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          exerciseId: exercise.id,
          level: targetLevel,
          solution: code,
          readme: files.readme,
          perfSpec: files.perfCode,
          previousActionItems: (previousScore?.actionItems ?? []).map((item: ActionItem) => ({
            text: item.text,
            status: item.status,
            note: item.note,
            claimed: item.claimed,
          })),
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Scoring failed");

      const parsed = JSON.parse(data.output);
      const score: CodeQualityScore = {
        score: Math.max(0, Math.min(100, Math.round(Number(parsed.score)))),
        summary: String(parsed.summary || "Code quality score is ready."),
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.filter((item: unknown) => typeof item === "string") : [],
        improvements: Array.isArray(parsed.improvements)
          ? parsed.improvements.filter((item: unknown) => typeof item === "string")
          : [],
        analysis:
          parsed.analysis && typeof parsed.analysis === "object"
            ? ({
                kind:
                  parsed.analysis.kind === "complexity" ? "complexity" : "react-performance",
                title: String(parsed.analysis.title || "Analysis"),
                summary: String(parsed.analysis.summary || "Analysis unavailable."),
                ...(parsed.analysis.kind === "complexity"
                  ? {
                      expected:
                        typeof parsed.analysis.expected === "string" ? parsed.analysis.expected : undefined,
                      actual: typeof parsed.analysis.actual === "string" ? parsed.analysis.actual : undefined,
                      verdict:
                        parsed.analysis.verdict === "meets" ||
                        parsed.analysis.verdict === "close" ||
                        parsed.analysis.verdict === "slower" ||
                        parsed.analysis.verdict === "unknown"
                          ? parsed.analysis.verdict
                          : undefined,
                    }
                  : {
                      verdict:
                        parsed.analysis.verdict === "healthy" ||
                        parsed.analysis.verdict === "watch" ||
                        parsed.analysis.verdict === "risky" ||
                        parsed.analysis.verdict === "unknown"
                          ? parsed.analysis.verdict
                          : undefined,
                    }),
                bullets: Array.isArray(parsed.analysis.bullets)
                  ? parsed.analysis.bullets.filter((item: unknown) => typeof item === "string")
                  : [],
              } as ScoreAnalysis)
            : undefined,
        actionItems: Array.isArray(parsed.actionItems)
          ? parsed.actionItems
              .filter(
                (item: unknown): item is ActionItem =>
                  typeof item === "object" &&
                  item !== null &&
                  typeof item.text === "string" &&
                  (item.status === "open" || item.status === "done")
              )
              .map((item) => ({
                text: item.text,
                status: item.status,
                note: typeof item.note === "string" ? item.note : undefined,
                // Keep the learner's self-report sticky across regenerations: prefer the
                // agent's echoed claim, else fall back to what they had checked before.
                claimed:
                  item.claimed === true ||
                  (previousScore?.actionItems.find((prev) => prev.text === item.text)?.claimed ?? false),
              }))
          : [],
        studyPlan: Array.isArray(parsed.studyPlan)
          ? parsed.studyPlan
              .filter(
                (item: unknown): item is StudyTopic =>
                  typeof item === "object" && item !== null && typeof item.topic === "string"
              )
              .map((item) => ({ topic: item.topic, why: typeof item.why === "string" ? item.why : "" }))
          : [],
        createdAt: Date.now(),
        solutionHash,
      };

      saveCodeQualityScore(scoreKey, score);
      setQualityScores((prev) => ({ ...prev, [scoreKey]: { status: "done", score } }));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setQualityScores((prev) => ({ ...prev, [scoreKey]: { status: "error", error: message } }));
    }
  };

  const toggleActionItemClaim = (scope: QualityScoreScope, text: string) => {
    const scoreKey = `${key}/${scope}`;
    const current = getCodeQualityScore(scoreKey);
    if (!current) return;

    const next: CodeQualityScore = {
      ...current,
      actionItems: current.actionItems.map((item) =>
        item.text === text ? { ...item, claimed: !item.claimed } : item
      ),
    };
    saveCodeQualityScore(scoreKey, next);
    setQualityScores((prev) => ({ ...prev, [scoreKey]: { status: "done", score: next } }));
  };

  const qualityScoreForScope = (scope: QualityScoreScope): QualityScoreState => {
    const scoreKey = `${key}/${scope}`;
    const current = qualityScores[scoreKey];
    if (current) return current;

    const cached = getCodeQualityScore(scoreKey);
    return cached ? { status: "done", score: cached } : { status: "idle" };
  };

  // ── reusable panel bodies ──
  // Surface the saved retake goals + study plan below the spec, so they stay visible
  // while you redo the exercise with the completion modal closed.
  const exerciseScore = qualityScoreForScope("exercise");
  const retakeScore = exerciseScore.status === "done" ? exerciseScore.score : null;
  const readmeBody = (
    <>
      <div className="panel-head">README</div>
      <div className="panel-body scroll">
        <Markdown source={files.readme} />
        {retakeScore && (retakeScore.actionItems.length > 0 || retakeScore.studyPlan.length > 0) && (
          <div className="retake-goals">
            <div className="retake-goals-head">Retake goals</div>
            <ActionItemList
              items={retakeScore.actionItems}
              heading="Action items"
              hint="Check off what you've addressed; resubmit and the reviewer verifies it against your code."
              onToggleClaim={(text) => toggleActionItemClaim("exercise", text)}
            />
            <StudyPlanList topics={retakeScore.studyPlan} categoryId={categoryId} />
          </div>
        )}
      </div>
    </>
  );
  // Active file in the editor pane (solution is editable; the rest are read-only,
  // so you can inspect the tests / preview / perf spec while you debug).
  const openFiles: Record<string, { path: string; code: string; ro: boolean }> = {
    solution: { path: files.solutionPath, code, ro: false },
    test: { path: files.testPath, code: files.testCode, ro: true },
  };
  if (files.previewCode) openFiles.preview = { path: "/preview.tsx", code: previewCode, ro: false };
  if (files.perfCode) openFiles.perf = { path: "/perf.ts", code: files.perfCode, ro: true };
  const af = openFiles[activeFile] ?? openFiles.solution;

  const fileEntries: FileEntry[] = [
    { id: "solution", name: files.solutionPath.slice(1), readOnly: false },
    { id: "test", name: files.testPath.slice(1), readOnly: true },
    ...(files.previewCode ? [{ id: "preview", name: "preview.tsx", readOnly: false }] : []),
    ...(files.perfCode ? [{ id: "perf", name: "perf.ts", readOnly: true }] : []),
  ];

  const editorBody = (
    <>
      <div className="panel-head mono">
        <span className="editor-title">
          {af.path}
          {af.ro && <span className="ro-tag">read-only</span>}
        </span>
        <button
          className="editor-icon-btn"
          title={af.ro ? "Read-only files cannot be formatted" : `Format ${af.path}`}
          aria-label={af.ro ? "Cannot format read-only file" : `Format ${af.path}`}
          disabled={af.ro}
          onClick={() => void formatActiveFile()}
        >
          <span aria-hidden="true">fmt</span>
        </button>
      </div>
      <div className="panel-body">
        <CodeEditor
          path={af.path}
          value={af.code}
          onChange={editActiveFile}
          readOnly={af.ro}
          reveal={editorReveal?.path === af.path ? editorReveal : undefined}
        />
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
      onOpenTest={openTestAt}
    />
  );
  const previewContent = files.previewCode ? (
    <PreviewPanel
      previewCode={previewCode}
      solutionCode={executionCode}
      standaloneUrl={`/preview/${categoryId}/${exercise.id}`}
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
            title={
              executionPending
                ? "Wait for the latest code to run"
                : green
                  ? submitted
                    ? "Resubmit current code and regenerate the quality score"
                    : "Submit to unlock the next level"
                  : "Pass all tests to submit"
            }
          >
            {submitted ? "Resubmit" : "Submit"}
          </button>

          {submitted && (
            <button className="reset" title="Open saved summary for this level" onClick={() => openSummary(level)}>
              summary
            </button>
          )}

          <button className="reset" title="Reset code to starter" onClick={resetCode}>
            reset code
          </button>

          {hasPreview && (
            <button className="reset" title="Reset preview to starter" onClick={resetPreview}>
              reset preview
            </button>
          )}

          <button className="reset" title="Restore previous solution or preview drafts" onClick={() => setHistoryFile("solution")}>
            history
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
              <button
                className="banner-action"
                onClick={() => openSummary(submittedLevels.at(-1) ?? exercise.levels)}
              >
                summary
              </button>
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
          qualityScore={complete && insightsLevel === finalSummaryLevel ? qualityScoreForScope("exercise") : { status: "idle" }}
          complete={prog.unlockedLevel > exercise.levels}
          storageKey={complete && insightsLevel === finalSummaryLevel ? `${key}/exercise` : `${key}/level-${insightsLevel}`}
          showAiReview={complete && insightsLevel === finalSummaryLevel}
          onToggleClaim={(text) => toggleActionItemClaim("exercise", text)}
          onNext={() => {
            const next = insightsLevel + 1;
            setInsightsLevel(null);
            if (next <= exercise.levels) onLevel(next);
          }}
          onClose={() => setInsightsLevel(null)}
        />
      )}
      {historyFile && (
        <DraftHistoryPanel
          file={historyFile}
          snapshots={getDraftHistory(key, historyFile)}
          hasPreview={hasPreview}
          onFile={setHistoryFile}
          onRestore={restoreSnapshot}
          onClose={() => setHistoryFile(null)}
        />
      )}
    </div>
  );
}

function DraftHistoryPanel({
  file,
  snapshots,
  hasPreview,
  onFile,
  onRestore,
  onClose,
}: {
  file: DraftFile;
  snapshots: DraftSnapshot[];
  hasPreview: boolean;
  onFile: (file: DraftFile) => void;
  onRestore: (snapshot: DraftSnapshot) => void;
  onClose: () => void;
}) {
  return (
    <div className="history-panel">
      <div className="history-head">
        <strong>Draft history</strong>
        <button className="insights-close" title="Close history" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="history-tabs">
        <button className={`tab ${file === "solution" ? "active" : ""}`} onClick={() => onFile("solution")}>
          solution.tsx
        </button>
        {hasPreview && (
          <button className={`tab ${file === "preview" ? "active" : ""}`} onClick={() => onFile("preview")}>
            preview.tsx
          </button>
        )}
      </div>
      <div className="history-body">
        {snapshots.length === 0 ? (
          <p className="muted">No snapshots yet.</p>
        ) : (
          snapshots.map((snapshot) => (
            <button
              key={snapshot.id}
              className="history-item"
              onClick={() => onRestore(snapshot)}
              title="Restore this snapshot"
            >
              <span className="history-item-head">
                <strong>{snapshot.label}</strong>
                <span>{new Date(snapshot.savedAt).toLocaleString()}</span>
              </span>
              <code>{snapshot.code.split("\n").find((line) => line.trim()) ?? "empty draft"}</code>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
