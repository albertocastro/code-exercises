import { useEffect, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import type { ExerciseMeta } from "../../catalog";
import type { ExerciseFiles } from "./manifest";
import { CodeEditor } from "./Editor";
import { Markdown } from "./Markdown";
import { TestPanel } from "./TestPanel";
import { PreviewPanel } from "./PreviewPanel";
import {
  getExercise,
  recordAttempt,
  markPassed,
  submitLevel,
  type ExerciseProgress,
} from "./progress";
import { useTimer, fmtTime } from "./useTimer";
import type { RunResult } from "./runner/testRunner";

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
  const key = `${categoryId}/${exercise.id}`;
  const [code, setCode] = useState(files.solutionCode);
  const [tab, setTab] = useState<"tests" | "preview">(hasPreview ? "preview" : "tests");
  const [prog, setProg] = useState<ExerciseProgress>(() => getExercise(key));
  const [green, setGreen] = useState(false);
  const timer = useTimer();

  const submitted = !!prog.levels[level]?.submittedAt;
  const unlocked = prog.unlockedLevel;
  const canSubmit = green && !submitted;

  // Reset timer + green state on level change; auto-run the clock on a fresh level.
  useEffect(() => {
    setGreen(false);
    timer.setElapsed(0);
    if (submitted) timer.stop();
    else timer.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, exercise.id]);

  const onResult = (r: RunResult) => {
    setProg(recordAttempt(key, level));
    const isGreen = r.failed === 0 && r.passed > 0 && !r.compileError;
    setGreen(isGreen);
    if (isGreen) {
      timer.stop(); // auto-stop on pass
      setProg(markPassed(key, level));
    }
  };

  const submit = () => {
    setProg(submitLevel(key, level, timer.elapsed, exercise.levels));
    if (level < exercise.levels) onLevel(level + 1);
  };

  return (
    <div className="ws">
      <div className="ws-head">
        <h1>
          {exercise.id} — {exercise.name}
        </h1>

        <div className="ws-controls">
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
            title={
              submitted
                ? "Already submitted"
                : green
                  ? "Submit to unlock the next level"
                  : "Pass all tests to submit"
            }
          >
            {submitted ? "Submitted ✓" : "Submit"}
          </button>

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
                  <TestPanel
                    testCode={files.testCode}
                    solutionCode={code}
                    level={level}
                    onResult={onResult}
                  />
                </div>
              </div>
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
}
