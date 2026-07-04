const CHAT_PREFIX = "code-exercises-insights-chat:";
const QUALITY_PREFIX = "code-exercises-quality-score:";
const PR_REVIEW_PREFIX = "code-exercises-pr-review:";
const LAYOUT_KEY = "code-exercises-insights-layout";
const PR_REVIEW_THEME_KEY = "code-exercises-pr-review-theme";

export type InsightsLayout = "sidebar" | "center";
export type PrReviewTheme = "light" | "dark";
export type ChatMessage = { role: "user" | "assistant"; content: string };
export type ActionItem = {
  text: string;
  status: "open" | "done";
  note?: string;
  // Learner self-report ("I addressed this"), distinct from the agent's status.
  // Sent back on resubmit so the reviewer can verify the claim against the code.
  claimed?: boolean;
};
export type StudyTopic = {
  topic: string;
  why: string;
};
export type ScoreAnalysis =
  | {
      kind: "complexity";
      title: string;
      summary: string;
      expected?: string;
      actual?: string;
      verdict?: "meets" | "close" | "slower" | "unknown";
      bullets: string[];
    }
  | {
      kind: "react-performance";
      title: string;
      summary: string;
      verdict?: "healthy" | "watch" | "risky" | "unknown";
      bullets: string[];
    };
export type CodeQualityScore = {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  actionItems: ActionItem[];
  studyPlan: StudyTopic[];
  analysis?: ScoreAnalysis;
  createdAt: number;
  // Hash of the solution the score was generated from. Lets a resubmit skip the
  // agent call (and re-use this score) when the code hasn't changed.
  solutionHash?: string;
};

// GitHub-PR-style on-demand review of the learner's solution file. Comments are
// anchored to 1-based line numbers in the submitted solution and rendered inline.
export type PrReviewComment = {
  line: number;
  severity: "praise" | "nit" | "suggestion";
  body: string;
  suggestion?: string;
  // Per-comment reply thread (chat with the reviewer about this specific comment).
  // The original AI comment is NOT stored here; it seeds the transcript at send time.
  replies?: ChatMessage[];
};
export type PrReview = {
  verdict: "approve" | "comment" | "changes";
  summary: string;
  comments: PrReviewComment[];
  createdAt: number;
  // Hash of the solution the review was generated from, so re-opening unchanged
  // code reuses the cached review instead of re-calling the agent.
  solutionHash?: string;
};

// Small, fast, dependency-free string hash (djb2) for change-detection only.
export function hashSolution(code: string): string {
  let h = 5381;
  for (let i = 0; i < code.length; i += 1) {
    h = ((h << 5) + h + code.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

function parseChatMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (m): m is ChatMessage =>
      (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string"
  );
}

function parseStudyPlan(value: unknown): StudyTopic[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is { topic: string; why?: unknown } =>
        typeof item === "object" && item !== null && typeof (item as { topic?: unknown }).topic === "string"
    )
    .map((item) => ({
      topic: item.topic.trim(),
      why: typeof item.why === "string" ? item.why.trim() : "",
    }))
    .filter((item) => item.topic);
}

function parseScoreAnalysis(value: unknown): ScoreAnalysis | undefined {
  if (!value || typeof value !== "object") return undefined;
  const parsed = value as Record<string, unknown>;
  const title = typeof parsed.title === "string" ? parsed.title : "";
  const summary = typeof parsed.summary === "string" ? parsed.summary : "";
  const bullets = Array.isArray(parsed.bullets)
    ? parsed.bullets.filter((item: unknown): item is string => typeof item === "string")
    : [];

  if (!title || !summary) return undefined;

  if (parsed.kind === "complexity") {
    return {
      kind: "complexity",
      title,
      summary,
      expected: typeof parsed.expected === "string" ? parsed.expected : undefined,
      actual: typeof parsed.actual === "string" ? parsed.actual : undefined,
      verdict:
        parsed.verdict === "meets" ||
        parsed.verdict === "close" ||
        parsed.verdict === "slower" ||
        parsed.verdict === "unknown"
          ? parsed.verdict
          : undefined,
      bullets,
    };
  }

  if (parsed.kind === "react-performance") {
    return {
      kind: "react-performance",
      title,
      summary,
      verdict:
        parsed.verdict === "healthy" ||
        parsed.verdict === "watch" ||
        parsed.verdict === "risky" ||
        parsed.verdict === "unknown"
          ? parsed.verdict
          : undefined,
      bullets,
    };
  }

  return undefined;
}

export function getInsightsChat(key: string): ChatMessage[] {
  try {
    const value = localStorage.getItem(CHAT_PREFIX + key);
    if (!value) return [];
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is ChatMessage =>
        (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string"
    );
  } catch {
    return [];
  }
}

export function saveInsightsChat(key: string, messages: ChatMessage[]) {
  if (!messages.length) {
    clearInsightsChat(key);
    return;
  }

  localStorage.setItem(CHAT_PREFIX + key, JSON.stringify(messages));
}

export function clearInsightsChat(key: string) {
  localStorage.removeItem(CHAT_PREFIX + key);
}

export function getCodeQualityScore(key: string): CodeQualityScore | null {
  try {
    const value = localStorage.getItem(QUALITY_PREFIX + key);
    if (!value) return null;
    const parsed = JSON.parse(value);
    if (
      typeof parsed?.score !== "number" ||
      typeof parsed?.summary !== "string" ||
      !Array.isArray(parsed?.strengths) ||
      !Array.isArray(parsed?.improvements)
    ) {
      return null;
    }

    return {
      score: Math.max(0, Math.min(100, Math.round(parsed.score))),
      summary: parsed.summary,
      strengths: parsed.strengths.filter((item: unknown): item is string => typeof item === "string"),
      improvements: parsed.improvements.filter((item: unknown): item is string => typeof item === "string"),
      actionItems: Array.isArray(parsed.actionItems)
        ? parsed.actionItems
            .filter(
              (item): item is ActionItem =>
                typeof item?.text === "string" && (item?.status === "open" || item?.status === "done")
            )
            .map((item) => ({
              text: item.text,
              status: item.status,
              note: typeof item.note === "string" ? item.note : undefined,
              claimed: item.claimed === true,
            }))
        : [],
      studyPlan: parseStudyPlan(parsed.studyPlan),
      analysis: parseScoreAnalysis(parsed.analysis),
      createdAt: typeof parsed.createdAt === "number" ? parsed.createdAt : Date.now(),
      solutionHash: typeof parsed.solutionHash === "string" ? parsed.solutionHash : undefined,
    };
  } catch {
    return null;
  }
}

export function saveCodeQualityScore(key: string, score: CodeQualityScore) {
  localStorage.setItem(QUALITY_PREFIX + key, JSON.stringify(score));
}

export function clearCodeQualityScore(key: string) {
  localStorage.removeItem(QUALITY_PREFIX + key);
}

export function allCodeQualityScores(): Record<string, CodeQualityScore> {
  const scores: Record<string, CodeQualityScore> = {};

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(QUALITY_PREFIX)) continue;

    const score = getCodeQualityScore(key.slice(QUALITY_PREFIX.length));
    if (score) {
      scores[key.slice(QUALITY_PREFIX.length)] = score;
    }
  }

  return scores;
}

export function getPrReview(key: string): PrReview | null {
  try {
    const value = localStorage.getItem(PR_REVIEW_PREFIX + key);
    if (!value) return null;
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed?.comments) || typeof parsed?.summary !== "string") return null;

    return {
      verdict:
        parsed.verdict === "approve" || parsed.verdict === "changes" ? parsed.verdict : "comment",
      summary: parsed.summary,
      comments: parsed.comments
        .filter(
          (c: unknown): c is PrReviewComment =>
            typeof c === "object" && c !== null && typeof (c as PrReviewComment).body === "string"
        )
        .map((c: PrReviewComment) => ({
          line: Math.max(1, Math.round(Number(c.line)) || 1),
          severity: c.severity === "praise" || c.severity === "nit" ? c.severity : "suggestion",
          body: c.body,
          suggestion:
            typeof c.suggestion === "string" && c.suggestion.trim() ? c.suggestion : undefined,
          replies: parseChatMessages((c as PrReviewComment).replies),
        })),
      createdAt: typeof parsed.createdAt === "number" ? parsed.createdAt : Date.now(),
      solutionHash: typeof parsed.solutionHash === "string" ? parsed.solutionHash : undefined,
    };
  } catch {
    return null;
  }
}

export function savePrReview(key: string, review: PrReview) {
  localStorage.setItem(PR_REVIEW_PREFIX + key, JSON.stringify(review));
}

export function clearPrReview(key: string) {
  localStorage.removeItem(PR_REVIEW_PREFIX + key);
}

// Append a PR-review comment as a retake action item on the scope's saved score,
// deduping by text, so PR feedback and the retake checklist stay unified. Returns
// the updated score (or null if there's no saved score to attach to yet).
export function addActionItemToScore(key: string, text: string): CodeQualityScore | null {
  const current = getCodeQualityScore(key);
  if (!current) return null;
  const trimmed = text.trim();
  if (!trimmed || current.actionItems.some((item) => item.text === trimmed)) return current;

  const next: CodeQualityScore = {
    ...current,
    actionItems: [...current.actionItems, { text: trimmed, status: "open" }],
  };
  saveCodeQualityScore(key, next);
  return next;
}

export function getInsightsLayout(): InsightsLayout {
  return localStorage.getItem(LAYOUT_KEY) === "center" ? "center" : "sidebar";
}

export function saveInsightsLayout(layout: InsightsLayout) {
  localStorage.setItem(LAYOUT_KEY, layout);
}

// Persisted light/dark preference for the PR-review modal. Defaults to "dark"
// (matches the app) when nothing is stored. A persisted choice always wins; the
// modal may seed from prefers-color-scheme only when this returns null.
export function getPrReviewTheme(): PrReviewTheme | null {
  const value = localStorage.getItem(PR_REVIEW_THEME_KEY);
  return value === "light" || value === "dark" ? value : null;
}

export function savePrReviewTheme(theme: PrReviewTheme) {
  localStorage.setItem(PR_REVIEW_THEME_KEY, theme);
}
