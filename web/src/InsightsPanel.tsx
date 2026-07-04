import { useEffect, useRef, useState, type FormEvent } from "react";
import { fmtTime } from "./useTimer";
import type { LevelStat } from "./progress";
import {
  clearInsightsChat,
  getInsightsChat,
  getInsightsLayout,
  saveInsightsChat,
  saveInsightsLayout,
  type ActionItem,
  type ChatMessage,
  type CodeQualityScore,
  type InsightsLayout,
  type ScoreAnalysis,
  type StudyTopic,
} from "./insightsChat";

type QualityScoreState =
  | { status: "idle" | "loading" }
  | { status: "done"; score: CodeQualityScore }
  | { status: "error"; error: string };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="insight-stat">
      <div className="insight-stat-value">{value}</div>
      <div className="insight-stat-label">{label}</div>
    </div>
  );
}

function scoreTone(score: number) {
  if (score >= 90) return "excellent";
  if (score >= 75) return "solid";
  if (score >= 55) return "needs-work";
  return "low";
}

function scoreTitle(score: number) {
  if (score >= 90) return "Excellent work";
  if (score >= 75) return "Solid solution";
  if (score >= 55) return "Good progress";
  return "Keep iterating";
}

// A doc-site search link for a study topic. We deliberately render searches rather than
// agent-supplied URLs (which would be hallucinated): MDN has a real search endpoint;
// react.dev has none, so we scope a web search to the docs domain.
export function studySearchUrl(topic: string, categoryId: string): string {
  if (categoryId === "react") {
    return `https://duckduckgo.com/?q=${encodeURIComponent(`${topic} site:react.dev`)}`;
  }
  return `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(topic)}`;
}

function actionBadge(item: ActionItem): { label: string; tone: string } {
  if (item.claimed && item.status === "done") return { label: "Confirmed ✓", tone: "confirmed" };
  if (item.claimed && item.status === "open") return { label: "Reviewer disagrees", tone: "disputed" };
  if (item.status === "done") return { label: "Done", tone: "done" };
  return { label: "Open", tone: "open" };
}

export function StudyPlanList({ topics, categoryId }: { topics: StudyTopic[]; categoryId: string }) {
  if (!topics.length) return null;
  return (
    <div className="study-plan">
      <span>Study plan</span>
      <ul className="study-plan-list">
        {topics.map((t, i) => (
          <li key={`${t.topic}-${i}`}>
            <a href={studySearchUrl(t.topic, categoryId)} target="_blank" rel="noreferrer">
              {t.topic}
            </a>
            {t.why && <p className="study-plan-why">{t.why}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ActionItemList({
  items,
  heading,
  hint,
  onToggleClaim,
}: {
  items: ActionItem[];
  heading: string;
  hint: string;
  onToggleClaim?: (text: string) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="quality-actions">
      <span>{heading}</span>
      <p className="quality-actions-hint">{hint}</p>
      <ul className="quality-action-list">
        {items.map((item, i) => {
          const badge = actionBadge(item);
          return (
            <li
              key={`${item.text}-${i}`}
              className={`quality-action-item ${item.claimed ? "claimed" : "open"}`}
            >
              <label className="quality-action-check">
                <input
                  type="checkbox"
                  checked={!!item.claimed}
                  disabled={!onToggleClaim}
                  onChange={() => onToggleClaim?.(item.text)}
                />
              </label>
              <div className="quality-action-copy">
                <div className="quality-action-row">
                  <strong>{item.text}</strong>
                  <span className={`quality-action-status ${badge.tone}`}>{badge.label}</span>
                </div>
                {item.note && <p className="quality-action-note">{item.note}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function analysisTone(analysis: ScoreAnalysis | undefined) {
  if (!analysis?.verdict) return "unknown";
  if (analysis.kind === "complexity") return analysis.verdict;
  return analysis.verdict;
}

function analysisVerdictLabel(analysis: ScoreAnalysis) {
  if (analysis.kind === "complexity") {
    if (analysis.verdict === "meets") return "On target";
    if (analysis.verdict === "close") return "Close";
    if (analysis.verdict === "slower") return "Could be faster";
    return "Unknown";
  }

  if (analysis.verdict === "healthy") return "Healthy";
  if (analysis.verdict === "watch") return "Worth watching";
  if (analysis.verdict === "risky") return "Risky";
  return "Unknown";
}

function QualityScoreCard({
  state,
  categoryId,
  onToggleClaim,
}: {
  state: QualityScoreState;
  categoryId: string;
  onToggleClaim?: (text: string) => void;
}) {
  if (state.status === "idle" || state.status === "loading") {
    return (
      <section className="quality-card loading" aria-live="polite">
        <div>
          <div className="quality-label">Code quality</div>
          <strong>Scoring your solution…</strong>
          <p>Checking correctness, clarity, edge cases, and maintainability.</p>
        </div>
        <div className="quality-spinner" aria-hidden="true" />
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="quality-card error" aria-live="polite">
        <div className="quality-label">Code quality</div>
        <strong>Score unavailable</strong>
        <p>{state.error}</p>
      </section>
    );
  }

  const tone = scoreTone(state.score.score);
  return (
    <section className={`quality-card ${tone}`}>
      <div className="quality-score-main">
        <div>
          <div className="quality-label">Code quality</div>
          <strong>{scoreTitle(state.score.score)}</strong>
          <p>{state.score.summary}</p>
        </div>
        <div className="quality-meter" aria-label={`Code quality score ${state.score.score} out of 100`}>
          <span>{state.score.score}</span>
          <small>/100</small>
        </div>
      </div>

      {(state.score.strengths.length > 0 || state.score.improvements.length > 0) && (
        <div className="quality-notes">
          {state.score.strengths.length > 0 && (
            <div>
              <span>Working well</span>
              <ul>
                {state.score.strengths.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {state.score.improvements.length > 0 && (
            <div>
              <span>Next focus</span>
              <ul>
                {state.score.improvements.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {state.score.analysis && (
        <div className={`quality-analysis ${analysisTone(state.score.analysis)}`}>
          <div className="quality-analysis-head">
            <div>
              <span>{state.score.analysis.title}</span>
              <p className="quality-analysis-summary">{state.score.analysis.summary}</p>
            </div>
            <strong className="quality-analysis-badge">{analysisVerdictLabel(state.score.analysis)}</strong>
          </div>

          {state.score.analysis.kind === "complexity" &&
            (state.score.analysis.expected || state.score.analysis.actual) && (
              <div className="quality-analysis-metrics">
                {state.score.analysis.expected && (
                  <div>
                    <small>Expected</small>
                    <strong>{state.score.analysis.expected}</strong>
                  </div>
                )}
                {state.score.analysis.actual && (
                  <div>
                    <small>Your code</small>
                    <strong>{state.score.analysis.actual}</strong>
                  </div>
                )}
              </div>
            )}

          {state.score.analysis.bullets.length > 0 && (
            <ul className="quality-analysis-list">
              {state.score.analysis.bullets.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <StudyPlanList topics={state.score.studyPlan} categoryId={categoryId} />

      <ActionItemList
        items={state.score.actionItems}
        heading="Retake goals"
        hint="Check off what you've addressed; resubmit and the reviewer verifies it against your code."
        onToggleClaim={onToggleClaim}
      />
    </section>
  );
}

function InlineText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/g).map((part, i) =>
        part.startsWith("`") && part.endsWith("`") ? <code key={i}>{part.slice(1, -1)}</code> : part
      )}
    </>
  );
}

function ChatContent({ content }: { content: string }) {
  const blocks: Array<{ kind: "p"; text: string } | { kind: "ul"; items: string[] }> = [];
  const lines = content.split(/\r?\n/);
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ kind: "p", text: paragraph.join(" ") });
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    blocks.push({ kind: "ul", items: list });
    list = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (!trimmed) {
      flushParagraph();
      flushList();
    } else if (bullet) {
      flushParagraph();
      list.push(bullet[1]);
    } else {
      flushList();
      paragraph.push(trimmed);
    }
  }

  flushParagraph();
  flushList();

  return (
    <div className="chat-content">
      {blocks.map((block, i) =>
        block.kind === "p" ? (
          <p key={i}>
            <InlineText text={block.text} />
          </p>
        ) : (
          <ul key={i}>
            {block.items.map((item, j) => (
              <li key={j}>
                <InlineText text={item} />
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

export function InsightsPanel({
  categoryId,
  exerciseId,
  level,
  totalLevels,
  solutionCode,
  readme,
  stat,
  qualityScore,
  complete,
  storageKey,
  showAiReview,
  onToggleClaim,
  onOpenPrReview,
  onNext,
  onClose,
}: {
  categoryId: string;
  exerciseId: string;
  level: number;
  totalLevels: number;
  solutionCode: string;
  readme: string;
  stat: LevelStat | undefined;
  qualityScore: QualityScoreState;
  complete: boolean;
  storageKey: string;
  showAiReview: boolean;
  onToggleClaim?: (text: string) => void;
  onOpenPrReview?: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const [ai, setAi] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [aiOutput, setAiOutput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => getInsightsChat(storageKey));
  const [draft, setDraft] = useState("");
  const [layout, setLayout] = useState<InsightsLayout>(() => getInsightsLayout());
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    saveInsightsChat(storageKey, messages);
  }, [messages, storageKey]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, ai]);

  const changeLayout = (next: InsightsLayout) => {
    setLayout(next);
    saveInsightsLayout(next);
  };

  const askAgent = async (nextMessages: ChatMessage[]) => {
    setAi("loading");
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          exerciseId,
          level,
          solution: solutionCode,
          readme,
          messages: nextMessages,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        const content = data.output || "(no output)";
        setAiOutput(content);
        setMessages([...nextMessages, { role: "assistant", content }]);
        setAi("done");
      } else {
        const content = data.error || "Review failed";
        setAiOutput(content);
        setMessages([...nextMessages, { role: "assistant", content }]);
        setAi("error");
      }
    } catch {
      setAi("error");
      const content =
        "Couldn't reach the review server. AI review needs `npm run web` (dev) with an agent CLI configured.";
      setAiOutput(content);
      setMessages([...nextMessages, { role: "assistant", content }]);
    }
  };

  const runReview = async () => {
    setAiOutput("");
    setMessages([]);
    await askAgent([]);
  };

  const clearChat = () => {
    setAi("idle");
    setAiOutput("");
    setDraft("");
    setMessages([]);
    clearInsightsChat(storageKey);
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || ai === "loading") return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setDraft("");
    setMessages(nextMessages);
    await askAgent(nextMessages);
  };

  const panel = (
    <aside className={`insights-panel ${layout === "center" ? "center" : ""}`}>
      <div className="insights-head">
        <strong>{complete ? "🎉 Exercise complete!" : `Level ${level} submitted ✓`}</strong>
        <div className="insights-head-actions">
          <div className="insights-layout-toggle" aria-label="Summary layout">
            <button
              className={layout === "sidebar" ? "active" : ""}
              title="Show as side bar"
              onClick={() => changeLayout("sidebar")}
            >
              Side
            </button>
            <button
              className={layout === "center" ? "active" : ""}
              title="Show centered"
              onClick={() => changeLayout("center")}
            >
              Center
            </button>
          </div>
          <button className="insights-close" aria-label="close insights" onClick={onClose}>
            ×
          </button>
        </div>
      </div>

      <div className="insights-body">
        <div className="insights-stats">
          <Stat label="Time" value={fmtTime(stat?.timeMs ?? 0)} />
          <Stat label="Runs" value={String(stat?.attempts ?? 0)} />
          {stat?.complexity && <Stat label="Complexity" value={stat.complexity} />}
          {stat?.optimal !== undefined && (
            <Stat label="Optimal" value={stat.optimal ? "✓ yes" : "could be faster"} />
          )}
        </div>

        {showAiReview && (
          <>
            <QualityScoreCard state={qualityScore} categoryId={categoryId} onToggleClaim={onToggleClaim} />

            {onOpenPrReview && (
              <div className="insights-pr-review">
                <div className="insights-pr-review-copy">
                  <strong>AI review</strong>
                  <p>See a pull-request-style review with inline comments on your code.</p>
                </div>
                <button className="run-btn" onClick={onOpenPrReview}>
                  AI review
                </button>
              </div>
            )}

            <div className="insights-ai">
              <div className="insights-ai-head">
                <span>AI review chat</span>
                <div className="insights-ai-actions">
                  {messages.length > 0 && (
                    <button className="run-btn" disabled={ai === "loading"} onClick={clearChat}>
                      Clear chat
                    </button>
                  )}
                  <button className="run-btn" disabled={ai === "loading"} onClick={runReview}>
                    {ai === "loading" && !messages.length ? "Running…" : messages.length ? "Restart" : "Run codex"}
                  </button>
                </div>
              </div>
              <div className="insights-chat-shell">
                {messages.length > 0 ? (
                  <div className="insights-chat" aria-live="polite">
                    {messages.map((m, i) => (
                      <div key={i} className={`chat-message ${m.role}`}>
                        <div className="chat-role">{m.role === "user" ? "You" : "Tutor"}</div>
                        <ChatContent content={m.content} />
                      </div>
                    ))}
                    {ai === "loading" && (
                      <div className="chat-message assistant pending">
                        <div className="chat-role">Tutor</div>
                        <div className="thinking-row" aria-label="Tutor is thinking">
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                ) : ai !== "idle" ? (
                  <div className="insights-chat" aria-live="polite">
                    <div className="chat-message assistant pending">
                      <div className="chat-role">Tutor</div>
                      <div className="thinking-row" aria-label="Tutor is thinking">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="muted insights-ai-hint">
                    Ask for a tutor-style review, or start with a specific question about your solution.
                  </p>
                )}
                <form className="insights-chat-form" onSubmit={sendMessage}>
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={messages.length ? "Ask a follow-up…" : "Ask about your solution…"}
                    disabled={ai === "loading"}
                  />
                  <button className="run-btn" disabled={ai === "loading" || !draft.trim()}>
                    Send
                  </button>
                </form>
                {ai === "error" && aiOutput && (
                  <div className="insights-chat-error" role="alert">
                    {aiOutput}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="insights-foot">
        {!complete && level < totalLevels && (
          <button className="submit ready" onClick={onNext}>
            Next level →
          </button>
        )}
        <button className="run-btn" onClick={onClose}>
          Keep editing
        </button>
      </div>
    </aside>
  );

  if (layout === "center") {
    return <div className="insights-modal-backdrop">{panel}</div>;
  }

  return panel;
}
