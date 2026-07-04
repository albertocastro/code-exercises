import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, PrReview, PrReviewComment, PrRevision, PrReviewTheme } from "./insightsChat";
import { getPrReviewTheme, savePrReviewTheme } from "./insightsChat";

export type PrReviewState =
  | { status: "idle" | "loading" }
  // `revisions` is the full history (oldest → newest); the modal defaults to the
  // latest and lets the learner toggle back to earlier revisions.
  | { status: "done"; revisions: PrRevision[] }
  | { status: "error"; error: string };

// One highlighted line = a list of {content, color} spans. Plain-text fallback is
// a single span with no color, so rendering is identical whether Shiki loaded.
type HlLine = Array<{ content: string; color?: string }>;
// Tokens for both themes, produced from a single highlighter build. The active
// theme just picks which set to render — no rebuild on toggle.
type HlByTheme = { dark: HlLine[]; light: HlLine[] };

const SHIKI_THEME: Record<PrReviewTheme, string> = {
  dark: "dark-plus",
  light: "light-plus",
};

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

function plainLines(code: string): HlLine[] {
  return code.split("\n").map((line) => [{ content: line }]);
}

// Lazily build a standalone Shiki highlighter (independent of the Monaco theme
// registry) with BOTH light and dark themes loaded once, and tokenize the whole
// file against each. Falls back to plain lines (shared across themes) on any error.
async function highlightLines(code: string, lang: string): Promise<HlByTheme> {
  try {
    const { createHighlighter } = await import("shiki");
    const highlighter = await createHighlighter({
      themes: [SHIKI_THEME.dark, SHIKI_THEME.light],
      langs: [lang],
    });
    const toLines = (theme: string): HlLine[] =>
      highlighter
        // theme/lang are validated at build time above; Shiki's typed overloads
        // want its bundled-name unions, so mirror the original string-literal call.
        .codeToTokens(code, { theme: theme as never, lang: lang as never })
        .tokens.map((line) => line.map((t) => ({ content: t.content, color: t.color })));
    return { dark: toLines(SHIKI_THEME.dark), light: toLines(SHIKI_THEME.light) };
  } catch {
    const fallback = plainLines(code);
    return { dark: fallback, light: fallback };
  }
}

function langForFile(fileName: string): string {
  if (fileName.endsWith(".java")) return "java";
  if (fileName.endsWith(".tsx")) return "tsx";
  return "ts";
}

// Seed a comment's chat transcript for /api/review. The reviewer sees the original
// comment as its own prior assistant turn, and the first user message is framed with
// the line/severity so the reply stays anchored to what was flagged.
function buildTranscript(comment: PrReviewComment, draft: string): ChatMessage[] {
  const seed: ChatMessage = { role: "assistant", content: comment.body };
  const framedFirst = `Re: line ${comment.line} (${severityLabel[comment.severity]}) — ${draft}`;
  const replies = comment.replies ?? [];
  if (replies.length === 0) {
    return [seed, { role: "user", content: framedFirst }];
  }
  return [seed, ...replies, { role: "user", content: draft }];
}

function ReplyThread({
  comment,
  revisionIndex,
  commentIndex,
  onReplyToComment,
  onPersistReplies,
}: {
  comment: PrReviewComment;
  revisionIndex: number;
  commentIndex: number;
  onReplyToComment: (
    revisionIndex: number,
    commentIndex: number,
    messages: ChatMessage[]
  ) => Promise<string>;
  onPersistReplies: (
    revisionIndex: number,
    commentIndex: number,
    replies: ChatMessage[]
  ) => void;
}) {
  const replies = comment.replies ?? [];
  const [open, setOpen] = useState(replies.length > 0);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  const send = async () => {
    const trimmed = draft.trim();
    if (!trimmed || pending) return;
    setError(null);
    // The transcript sent to the reviewer includes the pending user turn; the
    // persisted thread mirrors it so a reopen shows the same messages.
    const transcript = buildTranscript(comment, trimmed);
    const userTurn: ChatMessage = { role: "user", content: trimmed };
    const withUser = [...replies, userTurn];
    onPersistReplies(revisionIndex, commentIndex, withUser);
    setPending(true);
    try {
      const answer = await onReplyToComment(revisionIndex, commentIndex, transcript);
      onPersistReplies(revisionIndex, commentIndex, [...withUser, { role: "assistant", content: answer }]);
      setDraft("");
    } catch (e) {
      // Roll back the optimistic user turn but keep the typed text so they can retry.
      onPersistReplies(revisionIndex, commentIndex, replies);
      setDraft(trimmed);
      setError(e instanceof Error ? e.message : "Reply failed. Try again.");
    } finally {
      setPending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="pr-reply">
      {replies.length > 0 && (
        <div className="pr-reply-list">
          {replies.map((m, i) => (
            <div key={i} className={`pr-reply-bubble ${m.role}`}>
              <span className="pr-reply-role">{m.role === "user" ? "You" : "Reviewer"}</span>
              <p className="pr-reply-text">{m.content}</p>
            </div>
          ))}
          {pending && (
            <div className="pr-reply-bubble assistant pending" aria-live="polite">
              <span className="pr-reply-role">Reviewer</span>
              <p className="pr-reply-text">…thinking</p>
            </div>
          )}
        </div>
      )}

      {open ? (
        <div className="pr-reply-box">
          <textarea
            ref={textareaRef}
            className="pr-reply-input"
            value={draft}
            placeholder="Reply to the reviewer… (Enter to send, Shift+Enter for newline)"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            disabled={pending}
          />
          {error && (
            <div className="pr-reply-error" role="alert">
              {error}
            </div>
          )}
          <div className="pr-reply-actions">
            <button
              className="pr-thread-btn"
              onClick={() => void send()}
              disabled={pending || !draft.trim()}
            >
              {pending ? "Sending…" : "Send"}
            </button>
            {replies.length === 0 && (
              <button
                className="pr-thread-btn ghost"
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                disabled={pending}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
        <button className="pr-thread-btn ghost" onClick={() => setOpen(true)}>
          Comment
        </button>
      )}
    </div>
  );
}

function CommentThread({
  comment,
  revisionIndex,
  commentIndex,
  onAddActionItem,
  onReplyToComment,
  onPersistReplies,
  added,
}: {
  comment: PrReviewComment;
  revisionIndex: number;
  commentIndex: number;
  onAddActionItem: (text: string) => void;
  onReplyToComment: (
    revisionIndex: number,
    commentIndex: number,
    messages: ChatMessage[]
  ) => Promise<string>;
  onPersistReplies: (
    revisionIndex: number,
    commentIndex: number,
    replies: ChatMessage[]
  ) => void;
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
      </div>
      <ReplyThread
        comment={comment}
        revisionIndex={revisionIndex}
        commentIndex={commentIndex}
        onReplyToComment={onReplyToComment}
        onPersistReplies={onPersistReplies}
      />
    </div>
  );
}

function initialTheme(): PrReviewTheme {
  const persisted = getPrReviewTheme();
  if (persisted) return persisted;
  // Persisted choice wins; on first open, seed from prefers-color-scheme, else dark.
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return "dark";
}

function fmtRevisionTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "";
  }
}

export function PrReviewModal({
  state,
  fileName,
  onAddActionItem,
  onReplyToComment,
  onPersistReplies,
  onClose,
}: {
  state: PrReviewState;
  fileName: string;
  onAddActionItem: (text: string) => void;
  onReplyToComment: (
    revisionIndex: number,
    commentIndex: number,
    messages: ChatMessage[]
  ) => Promise<string>;
  onPersistReplies: (
    revisionIndex: number,
    commentIndex: number,
    replies: ChatMessage[]
  ) => void;
  onClose: () => void;
}) {
  const [hl, setHl] = useState<HlByTheme>({ dark: [], light: [] });
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [theme, setTheme] = useState<PrReviewTheme>(initialTheme);

  const revisions = state.status === "done" ? state.revisions : [];
  const revisionCount = revisions.length;
  // Which revision is on screen. Default to the LATEST; clamp when the history
  // changes (e.g. a new revision appended while the modal is open).
  const [selectedIndex, setSelectedIndex] = useState(0);
  useEffect(() => {
    if (revisionCount > 0) setSelectedIndex(revisionCount - 1);
  }, [revisionCount]);
  const clampedIndex = revisionCount > 0 ? Math.min(selectedIndex, revisionCount - 1) : 0;
  const revision = revisions[clampedIndex];
  const isLatest = revisionCount > 0 && clampedIndex === revisionCount - 1;

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      savePrReviewTheme(next);
      return next;
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const lang = langForFile(fileName);
  // Highlight the SELECTED revision's own snapshot (comments are anchored to it),
  // not the live editor code. Re-runs whenever the selected revision changes.
  const snapshot = revision?.solutionSnapshot ?? "";
  useEffect(() => {
    let cancelled = false;
    // Seed a plain-text render immediately so the code shows before Shiki resolves.
    const fallback = plainLines(snapshot);
    setHl({ dark: fallback, light: fallback });
    void highlightLines(snapshot, lang).then((next) => {
      if (!cancelled) setHl(next);
    });
    return () => {
      cancelled = true;
    };
  }, [snapshot, lang]);

  const lines = theme === "light" ? hl.light : hl.dark;

  // Group the selected revision's comments by the line they anchor to, so each line
  // renders its threads directly after it (a line may carry more than one comment).
  // We keep each comment's stable index so reply persistence targets the right record.
  const commentsByLine = useMemo(() => {
    const map = new Map<number, Array<{ comment: PrReviewComment; index: number }>>();
    if (!revision) return map;
    const max = Math.max(1, lines.length);
    revision.comments.forEach((c, index) => {
      const line = Math.min(Math.max(1, c.line), max);
      const list = map.get(line) ?? [];
      list.push({ comment: c, index });
      map.set(line, list);
    });
    return map;
  }, [revision, lines.length]);

  const handleAdd = (text: string) => {
    onAddActionItem(text);
    setAdded((prev) => new Set(prev).add(text));
  };

  const verdict = revision ? verdictMeta[revision.verdict] : null;
  // A migrated legacy review has no stored snapshot; render its comments as a flat
  // list (no line-anchored code) and note that the snapshot is unavailable.
  const snapshotMissing = !!revision && !revision.snapshotAvailable;

  return (
    <div className="pr-backdrop" onClick={onClose}>
      <div
        className={`pr-modal theme-${theme}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pr-header">
          <div className="pr-header-main">
            {verdict && <span className={`pr-verdict ${verdict.tone}`}>{verdict.label}</span>}
            <div className="pr-header-text">
              <strong className="pr-file">{fileName}</strong>
              {revision && <p className="pr-summary">{revision.summary}</p>}
            </div>
          </div>
          <div className="pr-header-controls">
            {revisionCount > 1 && (
              <div className="pr-rev-switch" role="group" aria-label="Review revision">
                <button
                  className="pr-rev-btn"
                  aria-label="Previous revision"
                  title="Previous revision"
                  disabled={clampedIndex === 0}
                  onClick={() => setSelectedIndex(Math.max(0, clampedIndex - 1))}
                >
                  ‹
                </button>
                <span className="pr-rev-label" title={fmtRevisionTime(revision?.createdAt ?? 0)}>
                  Revision {clampedIndex + 1} of {revisionCount}
                  {isLatest && <span className="pr-rev-latest">latest</span>}
                </span>
                <button
                  className="pr-rev-btn"
                  aria-label="Next revision"
                  title="Next revision"
                  disabled={clampedIndex >= revisionCount - 1}
                  onClick={() => setSelectedIndex(Math.min(revisionCount - 1, clampedIndex + 1))}
                >
                  ›
                </button>
              </div>
            )}
            <button
              className="pr-theme-toggle"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              onClick={toggleTheme}
            >
              {theme === "dark" ? "☀" : "☾"}
            </button>
            <button className="pr-close" aria-label="close review" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        {revision && (
          <div className="pr-rev-meta">
            {revisionCount > 1 ? (
              <span>
                Revision {clampedIndex + 1} of {revisionCount}
                {isLatest ? " (latest)" : ""} · {fmtRevisionTime(revision.createdAt)}
              </span>
            ) : (
              <span>Reviewed {fmtRevisionTime(revision.createdAt)}</span>
            )}
            {snapshotMissing && (
              <span className="pr-rev-warn"> · snapshot unavailable for this revision</span>
            )}
          </div>
        )}

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
          ) : snapshotMissing ? (
            // No snapshot to anchor to (migrated legacy review): flat comment list.
            <div className="pr-comment-list">
              {revision!.comments.length === 0 ? (
                <p className="pr-empty">No inline comments on this revision.</p>
              ) : (
                revision!.comments.map((comment, index) => (
                  <CommentThread
                    key={index}
                    comment={comment}
                    revisionIndex={clampedIndex}
                    commentIndex={index}
                    onAddActionItem={handleAdd}
                    onReplyToComment={onReplyToComment}
                    onPersistReplies={onPersistReplies}
                    added={added.has(comment.body)}
                  />
                ))
              )}
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
                    {threads?.map(({ comment, index }) => (
                      <CommentThread
                        key={index}
                        comment={comment}
                        revisionIndex={clampedIndex}
                        commentIndex={index}
                        onAddActionItem={handleAdd}
                        onReplyToComment={onReplyToComment}
                        onPersistReplies={onPersistReplies}
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
