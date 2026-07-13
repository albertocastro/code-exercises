import type { RunResult } from "./runner/testRunner";

function findTestLine(testCode: string, name: string): number | undefined {
  const lines = testCode.split("\n");
  const quoted = [`test("${name}"`, `test('${name}'`, `it("${name}"`, `it('${name}'`];
  const index = lines.findIndex((line) => quoted.some((needle) => line.includes(needle)));
  return index >= 0 ? index + 1 : undefined;
}

export function TestPanel({
  testCode,
  level,
  result,
  running,
  onRun,
  onOpenTest,
  canStop,
  onStop,
}: {
  testCode: string;
  level: number;
  result: RunResult | null;
  running: boolean;
  onRun: () => void;
  onOpenTest?: (line?: number) => void;
  // When a run is executing in the worker it can be killed; the parent wires
  // these to terminate() so a runaway (infinite loop) can be stopped by hand.
  canStop?: boolean;
  onStop?: () => void;
}) {
  return (
    <div className="tests">
      <div className="tests-bar">
        <button className="run-btn" title="Re-run tests (⌘/Ctrl+Enter)" onClick={onRun}>
          ↻ Run <span className="run-hint">⌘↵</span>
        </button>
        {canStop && onStop && (
          <button className="stop-btn" title="Stop the running tests" onClick={onStop}>
            ■ Stop
          </button>
        )}
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
