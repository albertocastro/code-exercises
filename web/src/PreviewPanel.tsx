import { Component, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { compilePreview } from "./runner/preview";
import type { ConsoleSink } from "./runner/consoleCapture";

const URL_CHANGE_EVENT = "code-exercises:urlchange";
let restoreHistoryTracking: (() => void) | null = null;
let historyTrackingRefs = 0;

function installHistoryTracking() {
  historyTrackingRefs += 1;
  if (restoreHistoryTracking) return () => uninstallHistoryTracking();

  const originalPushState = window.history.pushState.bind(window.history);
  const originalReplaceState = window.history.replaceState.bind(window.history);
  const notify = () => window.dispatchEvent(new Event(URL_CHANGE_EVENT));

  window.history.pushState = ((...args) => {
    originalPushState(...args);
    notify();
  }) as History["pushState"];
  window.history.replaceState = ((...args) => {
    originalReplaceState(...args);
    notify();
  }) as History["replaceState"];

  restoreHistoryTracking = () => {
    window.history.pushState = originalPushState;
    window.history.replaceState = originalReplaceState;
    restoreHistoryTracking = null;
  };

  return () => uninstallHistoryTracking();
}

function uninstallHistoryTracking() {
  historyTrackingRefs = Math.max(0, historyTrackingRefs - 1);
  if (historyTrackingRefs === 0) restoreHistoryTracking?.();
}

function errorToString(error: unknown): string {
  if (error instanceof Error) return error.stack || error.message;
  return String(error);
}

class ErrorBoundary extends Component<
  { children: ReactNode; onConsole?: ConsoleSink },
  { error: string | null }
> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: unknown) {
    return { error: errorToString(e) };
  }
  componentDidCatch(error: unknown) {
    this.props.onConsole?.({
      source: "preview",
      level: "error",
      args: [errorToString(error)],
    });
  }
  render() {
    if (this.state.error) return <pre className="run-error">{this.state.error}</pre>;
    return this.props.children;
  }
}

export function PreviewPanel({
  previewCode,
  solutionCode,
  stylesCode,
  standaloneUrl,
  onConsole,
}: {
  previewCode: string;
  solutionCode: string;
  stylesCode?: string;
  standaloneUrl?: string;
  onConsole?: ConsoleSink;
}) {
  const [Demo, setDemo] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [url, setUrl] = useState(() => window.location.href);
  const [draftUrl, setDraftUrl] = useState(() => window.location.href);
  const initialUrlRef = useRef(window.location.href);

  useEffect(() => {
    if (!onConsole) return;

    const onError = (event: ErrorEvent) => {
      onConsole({
        source: "preview",
        level: "error",
        args: [event.error ? errorToString(event.error) : event.message],
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      onConsole({
        source: "preview",
        level: "error",
        args: [errorToString(event.reason)],
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [onConsole]);

  useEffect(() => {
    const cleanup = installHistoryTracking();
    const syncUrl = () => setUrl(window.location.href);
    window.addEventListener("popstate", syncUrl);
    window.addEventListener(URL_CHANGE_EVENT, syncUrl);
    return () => {
      window.removeEventListener("popstate", syncUrl);
      window.removeEventListener(URL_CHANGE_EVENT, syncUrl);
      const initialUrl = new URL(initialUrlRef.current);
      window.history.replaceState({}, "", `${initialUrl.pathname}${initialUrl.search}${initialUrl.hash}`);
      cleanup();
    };
  }, []);

  useEffect(() => {
    try {
      const C = compilePreview(previewCode, solutionCode, onConsole, stylesCode);
      setDemo(() => C);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDemo(null);
    }
  }, [previewCode, solutionCode, stylesCode]);

  useEffect(() => {
    setDraftUrl(url);
  }, [url]);

  const applyUrl = () => {
    try {
      const next = new URL(draftUrl, window.location.origin);
      window.history.pushState({}, "", `${next.pathname}${next.search}${next.hash}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    } catch {
      // Keep the current URL if the input is invalid.
    }
  };

  return (
    <div className="preview-wrap">
      <div className="preview-bar">
        <button className="run-btn" title="Refresh preview" onClick={() => setRefresh((n) => n + 1)}>
          ↻ Refresh
        </button>
        {standaloneUrl ? (
          <a className="run-btn" href={standaloneUrl} target="_blank" rel="noreferrer">
            Open standalone
          </a>
        ) : null}
        <input
          className="url-input"
          aria-label="Preview URL"
          value={draftUrl}
          onChange={(e) => setDraftUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyUrl();
          }}
        />
        <button className="run-btn" title="Apply URL" onClick={applyUrl}>
          Go
        </button>
      </div>
      {error ? (
        <pre className="run-error">{error}</pre>
      ) : Demo ? (
        <div className="preview-host">
          {/* Remount on edit or refresh so a thrown render / state resets cleanly. */}
          <ErrorBoundary key={`${solutionCode}-${refresh}`} onConsole={onConsole}>
            <Demo />
          </ErrorBoundary>
        </div>
      ) : null}
    </div>
  );
}
