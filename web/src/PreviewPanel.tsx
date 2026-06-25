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

  if (error) return <pre className="run-error">{error}</pre>;
  if (!Demo) return null;
  return (
    <div className="preview-host">
      {/* Remount on edit so a thrown render resets cleanly. */}
      <ErrorBoundary key={solutionCode}>
        <Demo />
      </ErrorBoundary>
    </div>
  );
}
