import { useEffect, useMemo, useState } from "react";
import type { PrReview, PrReviewComment } from "./insightsChat";

export type PrReviewState =
  | { status: "idle" | "loading" }
  | { status: "done"; review: PrReview }
  | { status: "error"; error: string };

// One highlighted line = a list of {content, color} spans. Plain-text fallback is
// a single span with no color, so rendering is identical whether Shiki loaded.
type HlLine = Array<{ content: string; color?: string }>;

const verdictMeta: Record<PrReview["verdict"], { label: string; tone: string }> = {
  approve: { label: "Approved", tone: "approve" },
  comment: { label: "Commented", tone: "comment" },
  changes: { label: "Changes requested", tone: "changes" },
};

const severityLabel: Record<PrReviewComment["severity"], string> = {
  praise: "Praise",
  nit: "Nit",
  suggestion: "Suggestion",
};

// Lazily build a standalone Shiki highlighter (independent of the Monaco theme
// registry) and tokenize the whole file. Falls back to plain lines on any error.
async function highlightLines(code: string, lang: string): Promise<HlLine[]> {
  try {
    const { createHighlighter } = await import("shiki");
    const highlighter = await createHighlighter({
      themes: ["dark-plus"],
      langs: [lang],
    });
    const { tokens } = highlighter.codeToTokens(code, { theme: "dark-plus", lang });
    return tokens.map((line) => line.map((t) => ({ content: t.content, color: t.color })));
  } catch {
    return code.split("\n").map((line) => [{ content: line }]);
  }
}

function langForFile(fileName: string): string {
  if (fileName.endsWith(".java")) return "java";
  if (fileName.endsWith(".tsx")) return "tsx";
  return "ts";
}

function CommentThread({
  comment,
  onAddActionItem,
  onFollowUp,
  added,
}: {
  comment: PrReviewComment;
  onAddActionItem: (text: string) => void;
  onFollowUp?: (comment: PrReviewComment) => void;
  added: boolean;
}) {
  return (
    <div className={`pr-thread ${comment.severity}`}>
      <div className="pr-thread-head">
        <span className={`pr-severity ${comment.severity}`}>{severityLabel[comment.severity]}</span>
        <span className="pr-thread-line">Line {comment.line}</span>
      </div>
      <p className="pr-thread-body">{comment.body}</p>
      {comment.suggestion && (
        <div className="pr-suggestion">
          <div className="pr-suggestion-label">Suggested change</div>
          <pre className="pr-suggestion-code">
            <code>{comment.suggestion}</code>
          </pre>
        </div>
      )}
      <div className="pr-thread-actions">
        <button
          className="pr-thread-btn"
          disabled={added}
          onClick={() => onAddActionItem(comment.body)}
        >
          {added ? "Added ✓" : "Add to action items"}
        </button>
        {onFollowUp && (
          <button className="pr-thread-btn ghost" onClick={() => onFollowUp(comment)}>
            Ask a follow-up
          </button>
        )}
      </div>
    </div>
  );
}

export function PrReviewModal({
  state,
  fileName,
  solutionCode,
  onAddActionItem,
  onFollowUp,
  onClose,
}: {
  state: PrReviewState;
  fileName: string;
  solutionCode: string;
  onAddActionItem: (text: string) => void;
  onFollowUp?: (comment: PrReviewComment) => void;
  onClose: () => void;
}) {
  const [lines, setLines] = useState<HlLine[]>([]);
  const [added, setAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const lang = langForFile(fileName);
  useEffect(() => {
    let cancelled = false;
    // Seed a plain-text render immediately so the code shows before Shiki resolves.
    setLines(solutionCode.split("\n").map((line) => [{ content: line }]));
    void highlightLines(solutionCode, lang).then((hl) => {
      if (!cancelled) setLines(hl);
    });
    return () => {
      cancelled = true;
    };
  }, [solutionCode, lang]);

  // Group comments by the line they anchor to, so each line can render its threads
  // directly after it (a line may legitimately carry more than one comment).
  const commentsByLine = useMemo(() => {
    const map = new Map<number, PrReviewComment[]>();
    if (state.status !== "done") return map;
    const max = Math.max(1, lines.length);
    for (const c of state.review.comments) {
      const line = Math.min(Math.max(1, c.line), max);
      const list = map.get(line) ?? [];
      list.push(c);
      map.set(line, list);
    }
    return map;
  }, [state, lines.length]);

  const handleAdd = (text: string) => {
    onAddActionItem(text);
    setAdded((prev) => new Set(prev).add(text));
  };

  const verdict = state.status === "done" ? verdictMeta[state.review.verdict] : null;

  return (
    <div className="pr-backdrop" onClick={onClose}>
      <div className="pr-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="pr-header">
          <div className="pr-header-main">
            {verdict && <span className={`pr-verdict ${verdict.tone}`}>{verdict.label}</span>}
            <div className="pr-header-text">
              <strong className="pr-file">{fileName}</strong>
              {state.status === "done" && <p className="pr-summary">{state.review.summary}</p>}
            </div>
          </div>
          <button className="pr-close" aria-label="close review" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="pr-body">
          {state.status === "loading" || state.status === "idle" ? (
            <div className="pr-loading" aria-live="polite">
              <div className="quality-spinner" aria-hidden="true" />
              <span>Reviewing your solution…</span>
            </div>
          ) : state.status === "error" ? (
            <div className="pr-error" role="alert">
              <strong>Review unavailable</strong>
              <p>{state.error}</p>
            </div>
          ) : (
            <div className="pr-code">
              {lines.map((line, i) => {
                const lineNo = i + 1;
                const threads = commentsByLine.get(lineNo);
                return (
                  <div key={i}>
                    <div className="pr-line">
                      <span className="pr-gutter">{lineNo}</span>
                      <code className="pr-line-code">
                        {line.length ? (
                          line.map((tok, j) => (
                            <span key={j} style={tok.color ? { color: tok.color } : undefined}>
                              {tok.content}
                            </span>
                          ))
                        ) : (
                          <span> </span>
                        )}
                      </code>
                    </div>
                    {threads?.map((comment, k) => (
                      <CommentThread
                        key={k}
                        comment={comment}
                        onAddActionItem={handleAdd}
                        onFollowUp={onFollowUp}
                        added={added.has(comment.body)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
