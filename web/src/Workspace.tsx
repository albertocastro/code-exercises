import { useEffect, useMemo, useRef, useState } from "react";
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
  getLearnerFiles,
  saveLearnerFile,
  deleteLearnerFile,
  clearLearnerFiles,
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
import { runJavaExercise, runJavaMain } from "./runner/javaRunner";
import { runExercise, type RunResult } from "./runner/testRunner";
import { runExerciseInWorker, type WorkerRun } from "./runner/workerClient";
import type { ConsoleEntry, ConsoleSink } from "./runner/consoleCapture";
import { formatCode } from "./formatCode";
import {
  addActionItemToScore,
  clearCodeQualityScore,
  getCodeQualityScore,
  getPrRevisions,
  appendPrRevision,
  updatePrRevisionReplies,
  hashSolution,
  saveCodeQualityScore,
  getPixelPerfect,
  savePixelPerfect,
  type ActionItem,
  type ChatMessage,
  type CodeQualityScore,
  type PixelPerfectResult,
  type PrRevision,
  type ScoreAnalysis,
  type StudyTopic,
} from "./insightsChat";
import { PrReviewModal, type PrReviewState } from "./PrReviewModal";
import { PixelPerfectModal, type PixelPerfectState } from "./PixelPerfectModal";
import { capturePreviewScreenshot, stripDataUrlPrefix } from "./captureScreenshot";

type Layout = "split" | "columns";
type DiagnosticsTab = "preview" | "tests" | "console";
type DiagnosticsLayout = "single" | "split";
type ExerciseLanguage = "typescript" | "java";
type QualityScoreState =
  | { status: "idle" | "loading" }
  | { status: "done"; score: CodeQualityScore }
  | { status: "error"; error: string };
// "exercise" aggregates the whole exercise on the final summary; `level-N`
// scores an individual level so the tutor + score show on every submit/resubmit.
type QualityScoreScope = "exercise" | `level-${number}`;
const LAYOUT_KEY = "code-exercises-layout";
const EXECUTION_DEBOUNCE_MS = 800;
// Learner file tabs live under a distinct id namespace so they can never collide
// with the fixed tab ids (solution/test/preview/styles/main/perf).
const LEARNER_TAB_PREFIX = "learner:";
// Author-shipped / built-in names a learner file may not shadow.
const RESERVED_FILE_NAMES = new Set([
  "solution.tsx",
  "solution.ts",
  "preview.tsx",
  "styles.css",
  "README.md",
  "Main.java",
]);
const ALLOWED_LEARNER_EXTS = [".css", ".ts", ".tsx"];

function learnerStarter(name: string): string {
  if (name.endsWith(".css")) return `/* ${name} — your styles. Import it: import "./${name}"; */\n`;
  const base = name.replace(/\.(tsx?)$/, "");
  return `// ${name} — your module. Import it: import { thing } from "./${base}";\n`;
}

// Validate a proposed learner filename against the current set. Returns an error
// string to show the learner, or null when the name is acceptable.
function validateLearnerName(raw: string, existing: string[]): string | null {
  const name = raw.trim();
  if (!name) return "Enter a file name.";
  if (name.includes("/") || name.includes("\\")) return "Use a flat name — no folders or slashes.";
  if (!ALLOWED_LEARNER_EXTS.some((ext) => name.endsWith(ext)))
    return "File must end in .css, .ts, or .tsx.";
  if (RESERVED_FILE_NAMES.has(name)) return `"${name}" is a reserved file name.`;
  if (existing.includes(name)) return `"${name}" already exists.`;
  return null;
}
const SELF_IMPORT_RE =
  /(?:from\s+["']|require\(\s*["'])(?:\.\/|\/)solution(?:\.[tj]sx?)?["']/;

// For open-ended exercises the ONLY contract is a set of `data-testid`s that the
// black-box test file queries. Extract those literals from the test source so we
// can surface the contract to the learner. We match both the RTL query form
// (`getByTestId("...")`, `queryByTestId`, `findByTestId`, `AllByTestId`) and any
// literal `data-testid="..."` a test might use. Preserves first-seen order.
const TEST_ID_RE = /(?:ByTestId\(\s*["'`]([^"'`]+)["'`]|data-testid\s*=\s*["'`]([^"'`]+)["'`])/g;

function extractTestIds(testCode: string): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const match of testCode.matchAll(TEST_ID_RE)) {
    const id = match[1] ?? match[2];
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

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
  // Open-ended exercises are a single all-or-nothing suite: the learner owns the
  // whole layout and the only contract is a set of `data-testid`s. We suppress the
  // level UI for these (levels:1 means the single level IS the whole exercise, so
  // every score/PR/pixel scope already resolves to "exercise" — see submit /
  // onResult / openSummary / insightsScope). The required test IDs are sourced
  // straight from the loaded test file (files.testCode), the source of truth.
  const isOpen = exercise.open === true;
  const requiredTestIds = useMemo(
    () => (isOpen ? extractTestIds(files.testCode) : []),
    [isOpen, files.testCode]
  );
  const hasJava = categoryId === "leetcode" && !!files.javaSolutionCode && !!files.javaTestCode;
  // Java-only exercises ship no solution.ts — there's nothing to write in TypeScript,
  // so we land the learner directly in Java and hide the language toggle entirely.
  const javaOnly = hasJava && !files.solutionCode.trim();
  const languageStorageKey = `code-exercises-language:${key}`;
  const [language, setLanguage] = useState<ExerciseLanguage>(() =>
    javaOnly || (hasJava && localStorage.getItem(languageStorageKey) === "java") ? "java" : "typescript"
  );
  const solutionDraftKey = language === "java" ? `${key}/java` : key;
  const scoreBaseKey = language === "java" ? `${key}/java` : key;
  const currentSolutionPath = language === "java" ? files.javaSolutionPath ?? "/Solution.java" : files.solutionPath;
  const currentSolutionStarter = language === "java" ? files.javaSolutionCode ?? "" : files.solutionCode;
  const currentTestPath = language === "java" ? files.javaTestPath ?? "/SolutionTest.java" : files.testPath;
  const currentTestCode = language === "java" ? files.javaTestCode ?? "" : files.testCode;
  const currentMainPath = files.javaMainPath ?? "/Main.java";
  const currentMainStarter = files.javaMainCode ?? "";
  const [code, setCode] = useState(() => {
    const initialLanguage: ExerciseLanguage =
      javaOnly || (hasJava && localStorage.getItem(languageStorageKey) === "java") ? "java" : "typescript";
    const initialDraftKey = initialLanguage === "java" ? `${key}/java` : key;
    const initialStarter = initialLanguage === "java" ? files.javaSolutionCode ?? "" : files.solutionCode;
    const draft = getDraft(initialDraftKey);
    if (!draft) return initialStarter;
    if (initialLanguage === "java" || !isCorruptSolutionDraft(draft, files)) return draft;

    clearDraft(initialDraftKey, "solution", "Recovered corrupt solution draft");
    return initialStarter;
  });
  const [previewCode, setPreviewCode] = useState(
    () => getDraft(key, "preview") ?? files.previewCode ?? ""
  );
  const hasStyles = categoryId === "react" && files.stylesCode !== undefined;
  const [stylesCode, setStylesCode] = useState(
    () => getDraft(key, "styles") ?? files.stylesCode ?? ""
  );
  // Learner-created files ({ filename: content }), persisted per exercise. Only
  // React exercises expose the "+ Add file" affordance (module resolution +
  // preview live there); leetcode/Java use a different runner path.
  const supportsLearnerFiles = categoryId === "react";
  const [learnerFiles, setLearnerFiles] = useState<Record<string, string>>(() =>
    supportsLearnerFiles ? getLearnerFiles(key) : {}
  );
  // Stable key over learner-file contents so the test effect and preview only
  // re-run when a learner file actually changes (not on every unrelated render).
  const learnerFilesSig = useMemo(() => JSON.stringify(learnerFiles), [learnerFiles]);
  const [executionCode, setExecutionCode] = useState(code);
  const [javaMainCode, setJavaMainCode] = useState(
    () => getDraft(`${key}/java`, "main") ?? files.javaMainCode ?? ""
  );
  const [mainRunning, setMainRunning] = useState(false);
  const [mainReload, setMainReload] = useState(
    () => localStorage.getItem(`code-exercises-main-reload:${key}`) === "true"
  );
  const [testResult, setTestResult] = useState<RunResult | null>(null);
  const [testsRunning, setTestsRunning] = useState(true);
  // True only while a leetcode run is actually executing in a Web Worker (post
  // debounce, pre result) — gates the Stop button, which can kill that worker.
  const [canStop, setCanStop] = useState(false);
  const [testNonce, setTestNonce] = useState(0);
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
  const [prReviews, setPrReviews] = useState<Record<string, PrReviewState>>({});
  // Which scope's PR-review modal is open (null = closed).
  const [prReviewScope, setPrReviewScope] = useState<QualityScoreScope | null>(null);
  // Level the open PR review was generated for; reused by per-comment reply calls.
  const [prReviewLevel, setPrReviewLevel] = useState<number>(1);
  // AI Pixel Perfect: cached vision critique per scope, and which scope's modal is
  // open (null = closed). Overwrite semantics — re-running replaces the cached result.
  const [pixelPerfect, setPixelPerfect] = useState<Record<string, PixelPerfectState>>({});
  const [pixelPerfectScope, setPixelPerfectScope] = useState<QualityScoreScope | null>(null);
  const [historyFile, setHistoryFile] = useState<DraftFile | null>(null);
  const [layout, setLayout] = useState<Layout>(
    () => (localStorage.getItem(LAYOUT_KEY) as Layout) || "split"
  );
  const timer = useTimer(`${key}:L${level}`);
  const nextConsoleId = useRef(1);
  // The in-flight worker run (leetcode path), so the Stop button and the effect
  // cleanup can both terminate it.
  const workerRunRef = useRef<WorkerRun | null>(null);
  const mainAbortRef = useRef<AbortController | null>(null);
  const mainRunIdRef = useRef(0);
  // Synchronous in-flight registry for quality scoring, keyed by `${scoreKey}#${solutionHash}`.
  // The persisted score (carrying its solutionHash) is only written AFTER the /api/score
  // fetch resolves, and the `loading` status lives in async React state that a stale
  // render closure may not have observed yet. So two ensureQualityScore calls for the
  // same scope+hash (the pre-warm → Submit hand-off, or a fast double-Submit) could each
  // slip past the persisted-hash and `loading` guards and both fire a fetch. Because
  // /api/score is nondeterministic, that yields two different scores for identical code.
  // This ref is set before the fetch and cleared after, giving a render-independent
  // guarantee: at most one agent call is in flight per (scope, solution content).
  const scoringInFlight = useRef<Set<string>>(new Set());

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
    setTestResult(null);
    setTestsRunning(true);
    setInsightsLevel(null);
    // useTimer restores this level's persisted active-time from storage when the
    // key changes; don't clobber it with 0 here. Just set the running intent.
    if (submitted) timer.stop();
    else timer.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, exercise.id]);

  useEffect(() => {
    if (language === "java" && !hasJava) {
      setLanguage("typescript");
    }
  }, [hasJava, language]);

  useEffect(() => {
    localStorage.setItem(languageStorageKey, language);
    const draft = getDraft(solutionDraftKey);
    const next = draft ?? currentSolutionStarter;
    setCode(next);
    setExecutionCode(next);
    setJavaMainCode(getDraft(`${key}/java`, "main") ?? currentMainStarter);
    setGreen(false);
    setHint(null);
    setTestResult(null);
    setTestsRunning(true);
    setConsoleEntries([]);
    setActiveFile("solution");
    setLearnerFiles(supportsLearnerFiles ? getLearnerFiles(key) : {});
    setTab(hasPreview ? "preview" : "tests");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, exercise.id]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setConsoleEntries([]);
      setExecutionCode(code);
    }, EXECUTION_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [code]);

  const editActiveFile = (next: string) => {
    if (activeFile === "main") {
      setJavaMainCode(next);
      saveDraft(`${key}/java`, next, "main");
      return;
    }
    if (activeFile === "preview") {
      setPreviewCode(next);
      saveDraft(key, next, "preview");
      return;
    }
    if (activeFile === "styles") {
      setStylesCode(next);
      saveDraft(key, next, "styles");
      return;
    }
    if (activeFile.startsWith(LEARNER_TAB_PREFIX)) {
      const name = activeFile.slice(LEARNER_TAB_PREFIX.length);
      setLearnerFiles((prev) => ({ ...prev, [name]: next }));
      saveLearnerFile(key, name, next);
      return;
    }
    if (activeFile !== "solution") return;

    setCode(next);
    setGreen(false);
    setHint(null);
    saveDraft(solutionDraftKey, next);
  };
  const formatActiveFile = async () => {
    if (af.ro) return;
    if (language === "java") {
      setConsoleEntries((prev) => [
        ...prev,
        {
          id: nextConsoleId.current++,
          source: "system",
          level: "warn",
          args: ["Java formatting is not available in the browser editor yet."],
        },
      ]);
      setTab("console");
      return;
    }

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
    clearDraft(solutionDraftKey, "solution", "Before code reset");
    setCode(currentSolutionStarter);
    setExecutionCode(currentSolutionStarter);
    setGreen(false);
    setHint(null);
  };
  const resetPreview = () => {
    clearDraft(key, "preview", "Before preview reset");
    setPreviewCode(files.previewCode ?? "");
  };
  const resetStyles = () => {
    clearDraft(key, "styles", "Before styles reset");
    setStylesCode(files.stylesCode ?? "");
  };
  const resetMain = () => {
    clearDraft(`${key}/java`, "main", "Before main reset");
    setJavaMainCode(currentMainStarter);
  };
  const addLearnerFile = () => {
    const raw = window.prompt(
      "New file name (.css, .ts, or .tsx). Import it from solution.tsx with a same-folder path, e.g. import \"./theme.css\"."
    );
    if (raw === null) return; // cancelled
    const name = raw.trim();
    const error = validateLearnerName(name, Object.keys(learnerFiles));
    if (error) {
      window.alert(error);
      return;
    }
    const starter = learnerStarter(name);
    setLearnerFiles((prev) => ({ ...prev, [name]: starter }));
    saveLearnerFile(key, name, starter);
    setActiveFile(`${LEARNER_TAB_PREFIX}${name}`);
  };
  const deleteLearnerFileTab = (tabId: string) => {
    const name = tabId.slice(LEARNER_TAB_PREFIX.length);
    if (!window.confirm(`Delete ${name}? This removes the file and its draft.`)) return;
    deleteLearnerFile(key, name);
    setLearnerFiles((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    // If the deleted file's tab was open, fall back to the solution tab.
    setActiveFile((current) => (current === tabId ? "solution" : current));
  };
  const resetWholeExercise = () => {
    if (!confirm("Reset this exercise? This deletes its draft and progress, then returns to level 1.")) {
      return;
    }

    clearDraft(key, "solution", "Before exercise reset");
    if (hasJava) clearDraft(`${key}/java`, "solution", "Before exercise reset");
    if (hasJava) clearDraft(`${key}/java`, "main", "Before exercise reset");
    clearDraft(key, "preview", "Before exercise reset");
    clearDraft(key, "styles", "Before exercise reset");
    clearLearnerFiles(key);
    setCode(currentSolutionStarter);
    setExecutionCode(currentSolutionStarter);
    setPreviewCode(files.previewCode ?? "");
    setJavaMainCode(currentMainStarter);
    setStylesCode(files.stylesCode ?? "");
    setLearnerFiles({});
    setActiveFile("solution");
    setProg(resetExercise(key));
    setGreen(false);
    setHint(null);
    setConsoleEntries([]);
    // Wipe every per-level active-time total for this exercise, not just the
    // current level, so a full reset really starts the clock from zero.
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`code-exercises-timer:${key}:L`)) localStorage.removeItem(k);
    }
    timer.reset();
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
      archiveDraft(solutionDraftKey, code, "solution", "Before history restore");
      setCode(snapshot.code);
      setGreen(false);
      setHint(null);
      saveDraft(solutionDraftKey, snapshot.code);
      setActiveFile("solution");
    }
    setHistoryFile(null);
  };

  const openTestAt = (line?: number) => {
    setActiveFile("test");
    if (line) {
      setEditorReveal({ path: currentTestPath, line, nonce: Date.now() });
    }
  };

  const onResult = (r: RunResult) => {
    setProg(recordAttempt(key, level));
    const isGreen = r.failed === 0 && r.passed > 0 && !r.compileError;
    setGreen(isGreen);
    if (isGreen) {
      timer.stop();
      setProg(markPassed(key, level));
      // Pre-warm the quality score the instant tests pass — before the user clicks
      // Submit and opens the panel. The agent round-trip then runs in the
      // background, so the panel usually shows a ready score instead of a spinner.
      // ensureQualityScore dedupes by solution hash, so the Submit call reuses this
      // result when the code is unchanged. Final level rolls up to the exercise
      // scope; earlier levels pre-warm their per-level score.
      void ensureQualityScore(level, {
        scope: level === exercise.levels ? "exercise" : `level-${level}`,
      });
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

  const stopMain = () => {
    mainAbortRef.current?.abort();
    mainAbortRef.current = null;
  };

  const runMain = async () => {
    if (language !== "java") return;
    stopMain();
    const runId = ++mainRunIdRef.current;
    const controller = new AbortController();
    mainAbortRef.current = controller;
    setMainRunning(true);
    setConsoleEntries([]);
    setTab("console");
    try {
      await runJavaMain(
        code,
        javaMainCode,
        { solutionFileName: files.javaSolutionFileName, mainFileName: files.javaMainFileName },
        onConsole,
        controller.signal
      );
    } finally {
      if (mainRunIdRef.current === runId) {
        mainAbortRef.current = null;
        setMainRunning(false);
      }
    }
  };

  useEffect(() => {
    localStorage.setItem(`code-exercises-main-reload:${key}`, String(mainReload));
  }, [key, mainReload]);

  useEffect(() => {
    if (language !== "java" || !mainReload) return;
    const timeout = window.setTimeout(() => {
      void runMain();
    }, 650);
    return () => window.clearTimeout(timeout);
    // runMain closes over current code/main code and intentionally restarts on edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, javaMainCode, language, mainReload]);

  useEffect(() => {
    if (language !== "java") stopMain();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  useEffect(() => {
    return () => stopMain();
  }, []);

  // Window-level fallback for Cmd/Ctrl+Enter so "run tests" also works when
  // focus isn't inside the Monaco editor (e.g. the README panel or a button).
  // Monaco's own editor.addCommand (see Editor.tsx) handles the in-editor
  // case and calls preventDefault, so skip when that already fired.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.key !== "Enter" || !(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      setTestNonce((n) => n + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Plain-TS (leetcode) exercises run OFF the main thread in a Web Worker so a
  // learner's infinite loop / runaway allocation freezes only the worker (which we
  // terminate) rather than the whole tab. React/DOM exercises need getComputedStyle
  // + RTL against the real DOM, so they stay on the main-thread runExercise path.
  const useWorker =
    categoryId === "leetcode" && language !== "java" && typeof Worker !== "undefined";

  useEffect(() => {
    let cancelled = false;
    setTestsRunning(true);
    // Debounce so we don't recompile on every execution-code update or manual rerun.
    const timeout = window.setTimeout(async () => {
      const consoleSink: ConsoleSink = (entry) => {
        if (!cancelled) onConsole(entry);
      };
      let result: RunResult;
      if (language === "java") {
        result = await runJavaExercise(
          currentTestCode,
          executionCode,
          { solutionFileName: files.javaSolutionFileName, testFileName: files.javaTestFileName },
          level,
          consoleSink
        );
      } else if (useWorker) {
        // Fresh worker per run. Its promise always resolves (results, timeout,
        // user-stop, or crash) so we render every outcome uniformly.
        const run = runExerciseInWorker(currentTestCode, executionCode, level, consoleSink);
        workerRunRef.current = run;
        setCanStop(true);
        result = await run.promise;
        if (workerRunRef.current === run) {
          workerRunRef.current = null;
          setCanStop(false);
        }
      } else {
        result = await runExercise(
          currentTestCode,
          executionCode,
          level,
          consoleSink,
          hasStyles ? stylesCode : undefined,
          learnerFiles
        );
      }
      if (cancelled) return;
      setTestResult(result);
      setTestsRunning(false);
      onResult(result);
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      // A newer run started (or the exercise changed): kill any in-flight worker
      // so fast typing can't stack workers. `cancelled` above discards its result.
      if (workerRunRef.current) {
        workerRunRef.current.terminate("cancel");
        workerRunRef.current = null;
        setCanStop(false);
      }
    };
    // `onConsole` and `onResult` are render-local callbacks; this effect is keyed
    // to the code/test inputs that should actually trigger a fresh run. A learner
    // file edit must also re-run: key on its serialized contents (stable across
    // renders that don't change any learner file).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTestCode, executionCode, hasStyles, stylesCode, level, testNonce, language, useWorker, learnerFilesSig]);

  // Stop button: kill the in-flight worker now and surface a "stopped" result.
  const stopRun = () => {
    const run = workerRunRef.current;
    if (!run) return;
    workerRunRef.current = null;
    setCanStop(false);
    run.terminate("user"); // resolves run.promise → the awaiting effect renders it
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
    // Score every submit/resubmit: the completing level rolls up to the whole
    // exercise; earlier levels score per-level so the tutor + score panel works
    // mid-exercise too.
    void ensureQualityScore(level, { scope: completesExercise ? "exercise" : `level-${level}` });
  };

  const openSummary = (targetLevel: number) => {
    setInsightsLevel(targetLevel);
    const scope: QualityScoreScope =
      complete && targetLevel === finalSummaryLevel ? "exercise" : `level-${targetLevel}`;
    void ensureQualityScore(targetLevel, { scope });
  };

  const ensureQualityScore = async (
    targetLevel: number,
    options: { scope: QualityScoreScope } = { scope: "exercise" }
  ) => {
    const scoreKey = `${scoreBaseKey}/${options.scope}`;
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
    // second request when one is already in flight for this scope. The `loading`
    // React-state check catches the common case; the synchronous ref below closes the
    // render-timing gap (a stale closure that hasn't seen the `loading` state yet) so a
    // duplicate no-change request can never re-call the nondeterministic agent.
    const inFlightKey = `${scoreKey}#${solutionHash}`;
    if (qualityScores[scoreKey]?.status === "loading" || scoringInFlight.current.has(inFlightKey)) {
      return;
    }
    scoringInFlight.current.add(inFlightKey);

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
          language,
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
    } finally {
      scoringInFlight.current.delete(inFlightKey);
    }
  };

  const toggleActionItemClaim = (scope: QualityScoreScope, text: string) => {
    const scoreKey = `${scoreBaseKey}/${scope}`;
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
    const scoreKey = `${scoreBaseKey}/${scope}`;
    const current = qualityScores[scoreKey];
    if (current) return current;

    const cached = getCodeQualityScore(scoreKey);
    return cached ? { status: "done", score: cached } : { status: "idle" };
  };

  const prReviewForScope = (scope: QualityScoreScope): PrReviewState => {
    const reviewKey = `${scoreBaseKey}/${scope}`;
    const current = prReviews[reviewKey];
    if (current) return current;

    const cached = getPrRevisions(reviewKey);
    return cached.length ? { status: "done", revisions: cached } : { status: "idle" };
  };

  // On-demand PR-style review with a REVISION HISTORY. Each request after a code
  // change appends a new revision (capturing the reviewed code as its own
  // snapshot); earlier revisions and their reply threads are never overwritten. If
  // the LATEST revision already matches the current code hash, reuse it — no fetch,
  // no duplicate revision (mirrors the ensureQualityScore dedup).
  const ensurePrReview = async (
    targetLevel: number,
    options: { scope: QualityScoreScope }
  ) => {
    const reviewKey = `${scoreBaseKey}/${options.scope}`;
    const history = getPrRevisions(reviewKey);
    const latest = history.at(-1);
    const solutionHash = hashSolution(code);
    if (latest && latest.solutionHash === solutionHash) {
      setPrReviews((prev) => ({ ...prev, [reviewKey]: { status: "done", revisions: history } }));
      return;
    }

    if (prReviews[reviewKey]?.status === "loading") return;

    setPrReviews((prev) => ({ ...prev, [reviewKey]: { status: "loading" } }));
    try {
      const res = await fetch("/api/pr-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          exerciseId: exercise.id,
          level: targetLevel,
          language,
          solution: code,
          readme: files.readme,
          perfSpec: files.perfCode,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Review failed");

      const parsed = JSON.parse(data.output);
      const revision: PrRevision = {
        createdAt: Date.now(),
        solutionHash,
        // Capture the EXACT code reviewed; comments are line-anchored to this.
        solutionSnapshot: code,
        snapshotAvailable: true,
        verdict:
          parsed.verdict === "approve" || parsed.verdict === "changes" ? parsed.verdict : "comment",
        summary: String(parsed.summary || "Review is ready."),
        comments: Array.isArray(parsed.comments)
          ? parsed.comments
              .filter(
                (c: unknown): c is PrReview["comments"][number] =>
                  typeof c === "object" && c !== null && typeof (c as { body?: unknown }).body === "string"
              )
              .map((c) => ({
                line: Math.max(1, Math.round(Number(c.line)) || 1),
                severity:
                  c.severity === "praise" || c.severity === "nit" ? c.severity : "suggestion",
                body: String(c.body),
                suggestion:
                  typeof c.suggestion === "string" && c.suggestion.trim() ? c.suggestion : undefined,
              }))
          : [],
      };

      const nextHistory = appendPrRevision(reviewKey, revision);
      setPrReviews((prev) => ({ ...prev, [reviewKey]: { status: "done", revisions: nextHistory } }));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setPrReviews((prev) => ({ ...prev, [reviewKey]: { status: "error", error: message } }));
    }
  };

  const openPrReview = (scope: QualityScoreScope, targetLevel: number) => {
    setPrReviewScope(scope);
    setPrReviewLevel(targetLevel);
    void ensurePrReview(targetLevel, { scope });
  };

  // AI Pixel Perfect — resolve the display state for a scope: prefer in-memory
  // (loading/error/fresh), else fall back to a cached critique from localStorage.
  const pixelPerfectForScope = (scope: QualityScoreScope): PixelPerfectState => {
    const ppKey = `${scoreBaseKey}/${scope}`;
    const current = pixelPerfect[ppKey];
    if (current) return current;
    const cached = getPixelPerfect(ppKey);
    return cached ? { status: "done", result: cached } : { status: "idle" };
  };

  // Capture the learner's live `.preview-host` via html2canvas, POST the base64 PNG
  // to /api/pixel-perfect, and cache the normalized critique (with the screenshot).
  // Overwrite semantics: a fresh run replaces the previous cached result. Reuses the
  // cached result when the code hasn't changed (mirrors ensureQualityScore dedup).
  const ensurePixelPerfect = async (targetLevel: number, scope: QualityScoreScope) => {
    const ppKey = `${scoreBaseKey}/${scope}`;
    const solutionHash = hashSolution(code);
    const cached = getPixelPerfect(ppKey);
    if (cached && cached.solutionHash === solutionHash) {
      setPixelPerfect((prev) => ({ ...prev, [ppKey]: { status: "done", result: cached } }));
      return;
    }
    if (pixelPerfect[ppKey]?.status === "loading") return;

    setPixelPerfect((prev) => ({ ...prev, [ppKey]: { status: "loading" } }));
    try {
      // Read the live DOM at click time — capture whatever is currently rendered.
      const dataUrl = await capturePreviewScreenshot();
      const res = await fetch("/api/pixel-perfect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          exerciseId: exercise.id,
          level: targetLevel,
          readme: files.readme,
          screenshot: stripDataUrlPrefix(dataUrl),
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Design review failed");

      const parsed = JSON.parse(data.output);
      const result: PixelPerfectResult = {
        verdict:
          parsed.verdict === "good" || parsed.verdict === "poor" ? parsed.verdict : "needs-work",
        score: Math.max(0, Math.min(100, Math.round(Number(parsed.score)) || 0)),
        summary: String(parsed.summary || "Design review is ready."),
        findings: Array.isArray(parsed.findings) ? parsed.findings : [],
        screenshot: dataUrl,
        createdAt: Date.now(),
        solutionHash,
      };
      savePixelPerfect(ppKey, result);
      setPixelPerfect((prev) => ({ ...prev, [ppKey]: { status: "done", result } }));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setPixelPerfect((prev) => ({ ...prev, [ppKey]: { status: "error", error: message } }));
    }
  };

  const openPixelPerfect = (scope: QualityScoreScope, targetLevel: number) => {
    setPixelPerfectScope(scope);
    void ensurePixelPerfect(targetLevel, scope);
  };

  // "Add to action items" from a PR comment: append it to the scope's saved score
  // (deduped) so it joins the retake checklist. Falls back to per-level scope when
  // the exercise-level score isn't populated yet.
  const addPrCommentToActionItems = (scope: QualityScoreScope, text: string) => {
    const scoreKey = `${scoreBaseKey}/${scope}`;
    const next = addActionItemToScore(scoreKey, text);
    if (next) {
      setQualityScores((prev) => ({ ...prev, [scoreKey]: { status: "done", score: next } }));
    }
  };

  // Reply to a specific PR comment on a specific revision. Reuses the multi-turn
  // /api/review tutor chat (same endpoint InsightsPanel uses) with the same
  // exercise context, passing the per-comment transcript so the reviewer answers in
  // context. CRUCIAL: the `solution` context is THAT revision's snapshot (the code
  // that was reviewed), not the live editor code, so the thread stays coherent with
  // what the comment is anchored to. Returns the assistant's free-text reply; throws
  // on failure so the modal can show an inline error without losing typed text.
  const replyToPrComment = async (
    scope: QualityScoreScope,
    targetLevel: number,
    revisionIndex: number,
    messages: ChatMessage[]
  ): Promise<string> => {
    const reviewKey = `${scoreBaseKey}/${scope}`;
    const revision = getPrRevisions(reviewKey)[revisionIndex];
    // Fall back to live code only if the revision (or its snapshot) is unavailable
    // — e.g. a migrated legacy review with no stored snapshot.
    const reviewedSolution =
      revision && revision.snapshotAvailable ? revision.solutionSnapshot : code;
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId,
        exerciseId: exercise.id,
        level: targetLevel,
        language,
        solution: reviewedSolution,
        readme: files.readme,
        perfSpec: files.perfCode,
        messages,
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Reply failed");
    return String(data.output || "(no reply)");
  };

  // Persist a comment's reply thread into a specific (revisionIndex, commentIndex)
  // of the scope's cached history so reopening the modal restores the conversation.
  // Mutates only the matching comment and keeps the in-memory prReviews state in sync.
  const persistPrCommentReplies = (
    scope: QualityScoreScope,
    revisionIndex: number,
    commentIndex: number,
    replies: ChatMessage[]
  ) => {
    const reviewKey = `${scoreBaseKey}/${scope}`;
    const nextHistory = updatePrRevisionReplies(reviewKey, revisionIndex, commentIndex, replies);
    if (!nextHistory) return;
    setPrReviews((prev) => ({ ...prev, [reviewKey]: { status: "done", revisions: nextHistory } }));
  };

  // ── reusable panel bodies ──
  // Surface the saved retake goals + study plan below the spec, so they stay visible
  // while you redo the exercise with the completion modal closed.
  const exerciseScore = qualityScoreForScope("exercise");
  const retakeScore = exerciseScore.status === "done" ? exerciseScore.score : null;

  // Which score scope the open insights panel reflects: the final summary rolls up
  // the whole exercise; any other open level shows its own per-level score. The AI
  // tutor + score only make sense once a level has been submitted at least once.
  const insightsScope: QualityScoreScope =
    insightsLevel !== null && complete && insightsLevel === finalSummaryLevel
      ? "exercise"
      : `level-${insightsLevel ?? 0}`;
  const insightsSubmitted = insightsLevel !== null && !!prog.levels[insightsLevel]?.submittedAt;
  const readmeBody = (
    <>
      <div className="panel-head">README</div>
      <div className="panel-body scroll">
        {isOpen && (
          <div className="open-spec">
            <p className="open-spec-banner">
              Open-ended — you design the layout. Build against the test-ID contract
              below, and use <strong>+ Add file</strong> for extra components or CSS.
            </p>
            {requiredTestIds.length > 0 && (
              <div className="open-spec-ids">
                <div className="open-spec-ids-head">Required test IDs</div>
                <ul className="testid-chips">
                  {requiredTestIds.map((id) => (
                    <li key={id} className="testid-chip">
                      <code>{id}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
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
    solution: { path: currentSolutionPath, code, ro: false },
    test: { path: currentTestPath, code: currentTestCode, ro: true },
  };
  if (language === "java") openFiles.main = { path: currentMainPath, code: javaMainCode, ro: false };
  if (files.previewCode) openFiles.preview = { path: "/preview.tsx", code: previewCode, ro: false };
  if (hasStyles) openFiles.styles = { path: "/styles.css", code: stylesCode, ro: false };
  if (files.perfCode) openFiles.perf = { path: "/perf.ts", code: files.perfCode, ro: true };
  const learnerFileNames = Object.keys(learnerFiles).sort((a, b) => a.localeCompare(b));
  for (const name of learnerFileNames) {
    openFiles[`${LEARNER_TAB_PREFIX}${name}`] = {
      path: `/${name}`,
      code: learnerFiles[name],
      ro: false,
    };
  }
  const af = openFiles[activeFile] ?? openFiles.solution;

  const fileEntries: FileEntry[] = [
    { id: "solution", name: currentSolutionPath.slice(1), readOnly: false },
    ...(language === "java" ? [{ id: "main", name: currentMainPath.slice(1), readOnly: false }] : []),
    { id: "test", name: currentTestPath.slice(1), readOnly: true },
    ...(files.previewCode ? [{ id: "preview", name: "preview.tsx", readOnly: false }] : []),
    ...(hasStyles ? [{ id: "styles", name: "styles.css", readOnly: false }] : []),
    ...(files.perfCode ? [{ id: "perf", name: "perf.ts", readOnly: true }] : []),
    ...learnerFileNames.map((name) => ({
      id: `${LEARNER_TAB_PREFIX}${name}`,
      name,
      readOnly: false,
      deletable: true,
    })),
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
          onRunTests={() => setTestNonce((n) => n + 1)}
          onFormat={() => void formatActiveFile()}
          javaSiblings={
            language === "java"
              ? [
                  { name: files.javaSolutionFileName ?? "Solution.java", content: code },
                  { name: files.javaTestFileName ?? "SolutionTest.java", content: currentTestCode },
                  { name: files.javaMainFileName ?? "Main.java", content: javaMainCode },
                ]
              : undefined
          }
        />
      </div>
    </>
  );
  const testsContent = (
    <TestPanel
      testCode={currentTestCode}
      level={level}
      result={testResult}
      running={testsRunning}
      onRun={() => setTestNonce((n) => n + 1)}
      onOpenTest={openTestAt}
      canStop={canStop}
      onStop={stopRun}
    />
  );
  const previewContent = files.previewCode ? (
    <PreviewPanel
      previewCode={previewCode}
      solutionCode={executionCode}
      stylesCode={hasStyles ? stylesCode : undefined}
      learnerFiles={learnerFiles}
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
          {hasJava && !javaOnly && (
            <div className="language-switch" title="Exercise language">
              <button
                className={`lbtn ${language === "typescript" ? "active" : ""}`}
                onClick={() => setLanguage("typescript")}
              >
                JavaScript
              </button>
              <button
                className={`lbtn ${language === "java" ? "active" : ""}`}
                onClick={() => setLanguage("java")}
              >
                Java
              </button>
            </div>
          )}
          {javaOnly && (
            <div className="language-switch" title="This exercise is Java-only">
              <span className="lbtn active" aria-disabled="true">Java</span>
            </div>
          )}

          {language === "java" && (
            <div className="main-run-controls">
              <button
                className={`run-main-btn ${mainRunning ? "running" : ""}`}
                title="Compile and run Main.java"
                onClick={() => void runMain()}
              >
                <span aria-hidden="true">{mainRunning ? "■" : "▶"}</span>
                {mainRunning ? "Restart main" : "Run main"}
              </button>
              <label className="reload-toggle" title="Run Main.java automatically after Java code changes">
                <input
                  type="checkbox"
                  checked={mainReload}
                  onChange={(event) => setMainReload(event.target.checked)}
                />
                <span>reload</span>
              </label>
            </div>
          )}

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

          <div
            className={`timer ${timer.running ? "running" : ""} ${
              timer.running && !timer.active ? "idle" : ""
            }`}
          >
            <span
              className="time"
              title={
                timer.running && !timer.active
                  ? "Paused — counts only while you're active on this tab"
                  : undefined
              }
            >
              {fmtTime(timer.elapsed)}
            </span>
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

          {!isOpen && (
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
          )}

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

          {hasStyles && (
            <button className="reset" title="Reset styles.css to starter" onClick={resetStyles}>
              reset styles
            </button>
          )}

          {language === "java" && (
            <button className="reset" title="Reset Main.java to starter" onClick={resetMain}>
              reset main
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
              <span className="banner done">
                {isOpen ? "Exercise complete" : `All ${exercise.levels} levels complete`}
              </span>
              <span>Total time: {fmtTime(completedTime)}</span>
              <span>Runs: {completedAttempts || "0"}</span>
              {!isOpen && (
                <span>Avg / level: {fmtTime(exercise.levels ? completedTime / exercise.levels : 0)}</span>
              )}
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
          onAddFile={supportsLearnerFiles ? addLearnerFile : undefined}
          onDeleteFile={supportsLearnerFiles ? deleteLearnerFileTab : undefined}
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
          qualityScore={insightsSubmitted ? qualityScoreForScope(insightsScope) : { status: "idle" }}
          complete={prog.unlockedLevel > exercise.levels}
          storageKey={`${scoreBaseKey}/${insightsScope}`}
          showAiReview={insightsSubmitted}
          showPixelPerfect={
            insightsSubmitted && categoryId === "react" && exercise.open === true && hasPreview
          }
          onToggleClaim={(text) => toggleActionItemClaim(insightsScope, text)}
          onOpenPrReview={() => openPrReview(insightsScope, insightsLevel)}
          onOpenPixelPerfect={() => openPixelPerfect(insightsScope, insightsLevel)}
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
          snapshots={getDraftHistory(historyFile === "solution" ? solutionDraftKey : key, historyFile)}
          hasPreview={hasPreview}
          solutionName={currentSolutionPath.slice(1)}
          onFile={setHistoryFile}
          onRestore={restoreSnapshot}
          onClose={() => setHistoryFile(null)}
        />
      )}
      {prReviewScope !== null && (
        <PrReviewModal
          state={prReviewForScope(prReviewScope)}
          fileName={currentSolutionPath.slice(1)}
          onAddActionItem={(text) => addPrCommentToActionItems(prReviewScope, text)}
          onReplyToComment={(revisionIndex, _commentIndex, messages) =>
            replyToPrComment(prReviewScope, prReviewLevel, revisionIndex, messages)
          }
          onPersistReplies={(revisionIndex, commentIndex, replies) =>
            persistPrCommentReplies(prReviewScope, revisionIndex, commentIndex, replies)
          }
          onClose={() => setPrReviewScope(null)}
        />
      )}
      {pixelPerfectScope !== null && (
        <PixelPerfectModal
          state={pixelPerfectForScope(pixelPerfectScope)}
          onClose={() => setPixelPerfectScope(null)}
        />
      )}
    </div>
  );
}

function DraftHistoryPanel({
  file,
  snapshots,
  hasPreview,
  solutionName,
  onFile,
  onRestore,
  onClose,
}: {
  file: DraftFile;
  snapshots: DraftSnapshot[];
  hasPreview: boolean;
  solutionName: string;
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
          {solutionName}
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
