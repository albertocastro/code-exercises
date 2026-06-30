import { useEffect, useState } from "react";
import { runExercise, type RunResult } from "./runner/testRunner";
import type { ConsoleSink } from "./runner/consoleCapture";

function findTestLine(testCode: string, name: string): number | undefined {
  const lines = testCode.split("\n");
  const quoted = [`test("${name}"`, `test('${name}'`, `it("${name}"`, `it('${name}'`];
  const index = lines.findIndex((line) => quoted.some((needle) => line.includes(needle)));
  return index >= 0 ? index + 1 : undefined;
}

export function TestPanel({
  testCode,
  solutionCode,
  stylesCode,
  level,
  onResult,
  onConsole,
  onOpenTest,
}: {
  testCode: string;
  solutionCode: string;
  stylesCode?: string;
  level: number;
  onResult?: (r: RunResult) => void;
  onConsole?: ConsoleSink;
  onOpenTest?: (line?: number) => void;
}) {
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setRunning(true);
    // Debounce so we don't recompile on every keystroke.
    const t = setTimeout(async () => {
      const r = await runExercise(testCode, solutionCode, level, onConsole, stylesCode);
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
  }, [testCode, solutionCode, stylesCode, level, nonce]);

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
              <button
                key={i}
                type="button"
                className={`test-row ${r.status}`}
                onClick={() => onOpenTest?.(findTestLine(testCode, r.name) ?? r.line)}
                title="Open this test"
              >
                <span className="mark">{r.status === "pass" ? "✓" : "✗"}</span>
                <div className="test-text">
                  <div className="test-name">{r.name}</div>
                  {r.error && <pre className="test-err">{r.error}</pre>}
                </div>
              </button>
            ))}
      </div>
    </div>
  );
}
