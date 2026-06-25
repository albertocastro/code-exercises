import { Component, useEffect, useState, type ComponentType, type ReactNode } from "react";
import { compilePreview } from "./runner/preview";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  render() {
    if (this.state.error) return <pre className="run-error">{this.state.error}</pre>;
    return this.props.children;
  }
}

export function PreviewPanel({
  previewCode,
  solutionCode,
}: {
  previewCode: string;
  solutionCode: string;
}) {
  const [Demo, setDemo] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    try {
      const C = compilePreview(previewCode, solutionCode);
      setDemo(() => C);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDemo(null);
    }
  }, [previewCode, solutionCode]);

  return (
    <div className="preview-wrap">
      <div className="preview-bar">
        <button className="run-btn" title="Refresh preview" onClick={() => setRefresh((n) => n + 1)}>
          ↻ Refresh
        </button>
      </div>
      {error ? (
        <pre className="run-error">{error}</pre>
      ) : Demo ? (
        <div className="preview-host">
          {/* Remount on edit or refresh so a thrown render / state resets cleanly. */}
          <ErrorBoundary key={`${solutionCode}-${refresh}`}>
            <Demo />
          </ErrorBoundary>
        </div>
      ) : null}
    </div>
  );
}
