// Which AI backs the review/score/pr-review/pixel-perfect agents. Persisted in
// localStorage so the choice survives reloads and applies everywhere (Workspace
// and Insights both read it at request time). The server whitelists the value
// and falls back to its own default, so a stale stored value is harmless.
export type AiProvider = "codex" | "claude";

const KEY = "code-exercises-ai-provider";

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  codex: "Codex (GPT)",
  claude: "Claude Sonnet",
};

export function getAiProvider(): AiProvider {
  return localStorage.getItem(KEY) === "claude" ? "claude" : "codex";
}

export function setAiProvider(provider: AiProvider) {
  localStorage.setItem(KEY, provider);
}
