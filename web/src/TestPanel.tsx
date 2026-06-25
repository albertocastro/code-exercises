import { useEffect, useState } from "react";
import { runExercise, type RunResult } from "./runner/testRunner";

export function TestPanel({
  testCode,
  solutionCode,
  level,
  onResult,
}: {
  testCode: string;
  solutionCode: string;
  level: number;
  onResult?: (r: RunResult) => void;
}) {
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setRunning(true);
    // Debounce so we don't recompile on every keystroke.
    const t = setTimeout(async () => {
      const r = await runExercise(testCode, solutionCode, level);
      if (cancelled) return;
      setResult(r);
      setRunning(false);
      onResult?.(r);
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testCode, solutionCode, level, nonce]);

  return (
    <div className="tests">
      <div className="tests-bar">
        <button className="run-btn" title="Re-run tests" onClick={() => setNonce((n) => n + 1)}>
          ↻ Run
        </button>
        {running && <span className="muted">running…</span>}
        {!running && result && !result.compileError && (
          <>
            <span className={result.passed ? "ok" : "muted"}>✓ {result.passed} passing</span>
            {result.failed > 0 && <span className="bad">✗ {result.failed} failing</span>}
            {result.skipped > 0 && <span className="muted">• {result.skipped} skipped</span>}
            {result.failed === 0 && result.passed > 0 && (
              <span className="ok strong">Level {level} green ✓</span>
            )}
          </>
        )}
      </div>

      <div className="tests-body">
        {result?.compileError && <pre className="run-error">{result.compileError}</pre>}
        {result &&
          !result.compileError &&
          result.rows
            .filter((r) => r.status !== "skip")
            .map((r, i) => (
              <div key={i} className={`test-row ${r.status}`}>
                <span className="mark">{r.status === "pass" ? "✓" : "✗"}</span>
                <div className="test-text">
                  <div className="test-name">{r.name}</div>
                  {r.error && <pre className="test-err">{r.error}</pre>}
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
