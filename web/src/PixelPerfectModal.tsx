import { useEffect } from "react";
import type { PixelPerfectFinding, PixelPerfectResult } from "./insightsChat";

export type PixelPerfectState =
  | { status: "idle" | "loading" }
  | { status: "done"; result: PixelPerfectResult }
  | { status: "error"; error: string };

const verdictMeta: Record<PixelPerfectResult["verdict"], { label: string; tone: string }> = {
  good: { label: "Polished", tone: "approve" },
  "needs-work": { label: "Needs work", tone: "comment" },
  poor: { label: "Rough", tone: "changes" },
};

const severityLabel: Record<PixelPerfectFinding["severity"], string> = {
  praise: "Praise",
  nit: "Nit",
  issue: "Issue",
};

const categoryLabel: Record<PixelPerfectFinding["category"], string> = {
  spacing: "Spacing",
  color: "Color",
  typography: "Typography",
  readability: "Readability",
  hierarchy: "Hierarchy",
  consistency: "Consistency",
};

// Category display order mirrors the review order the prompt asks the model to
// follow, so findings read top-to-bottom the way a designer would evaluate a UI.
const CATEGORY_ORDER: PixelPerfectFinding["category"][] = [
  "spacing",
  "color",
  "typography",
  "readability",
  "hierarchy",
  "consistency",
];

export function PixelPerfectModal({
  state,
  onClose,
}: {
  state: PixelPerfectState;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const result = state.status === "done" ? state.result : null;
  const verdict = result ? verdictMeta[result.verdict] : null;

  // Group findings by category, preserving the designer-review order, so each
  // section renders its findings together (praise/nit/issue badges retained).
  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    findings: result ? result.findings.filter((f) => f.category === category) : [],
  })).filter((g) => g.findings.length > 0);

  return (
    <div className="pp-backdrop" onClick={onClose}>
      <div className="pp-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="pp-header">
          <div className="pp-header-main">
            {verdict && <span className={`pp-verdict ${verdict.tone}`}>{verdict.label}</span>}
            <div className="pp-header-text">
              <strong className="pp-title">AI Pixel Perfect</strong>
              {result && <p className="pp-summary">{result.summary}</p>}
            </div>
          </div>
          <div className="pp-header-controls">
            {result && (
              <div className="pp-score" aria-label={`Design score ${result.score} out of 100`}>
                <span>{result.score}</span>
                <small>/100</small>
              </div>
            )}
            <button className="pp-close" aria-label="close pixel perfect" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        <div className="pp-body">
          {state.status === "loading" || state.status === "idle" ? (
            <div className="pp-loading" aria-live="polite">
              <div className="quality-spinner" aria-hidden="true" />
              <span>Capturing and critiquing your design…</span>
            </div>
          ) : state.status === "error" ? (
            <div className="pp-error" role="alert">
              <strong>Design review unavailable</strong>
              <p>{state.error}</p>
            </div>
          ) : (
            result && (
              <>
                {result.screenshot && (
                  <figure className="pp-shot">
                    <img src={result.screenshot} alt="Captured preview that was reviewed" />
                    <figcaption>Exactly what the reviewer judged</figcaption>
                  </figure>
                )}

                {grouped.length === 0 ? (
                  <p className="pp-empty">No specific findings — nice and clean.</p>
                ) : (
                  <div className="pp-findings">
                    {grouped.map((group) => (
                      <section key={group.category} className="pp-group">
                        <h4 className="pp-group-head">{categoryLabel[group.category]}</h4>
                        <ul className="pp-finding-list">
                          {group.findings.map((f, i) => (
                            <li key={i} className={`pp-finding ${f.severity}`}>
                              <span className={`pp-severity ${f.severity}`}>
                                {severityLabel[f.severity]}
                              </span>
                              <p className="pp-observation">{f.observation}</p>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                )}
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
}
