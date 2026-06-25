import { Component, type ReactNode } from "react";

/**
 * App-level backstop: if anything throws (e.g. React "Too many re-renders" from
 * a buggy solution that escapes the preview boundary), show a recoverable screen
 * instead of a blank/frozen page.
 */
export class AppErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };

  static getDerivedStateFromError(e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-crash">
          <h2>Something broke</h2>
          <pre>{this.state.error}</pre>
          <p>This is usually a bug in the exercise solution. Your code is saved.</p>
          <div className="app-crash-actions">
            <button className="exercise-button" onClick={() => this.setState({ error: null })}>
              Try to recover
            </button>
            <button className="exercise-button" onClick={() => location.reload()}>
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
