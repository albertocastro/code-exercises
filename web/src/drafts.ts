// Persist the learner's edited solution per exercise so work survives navigation
// and reloads. Keyed by `${categoryId}/${exerciseId}`.
const PREFIX = "code-exercises-draft:";

export function getDraft(key: string): string | null {
  return localStorage.getItem(PREFIX + key);
}
export function saveDraft(key: string, code: string) {
  localStorage.setItem(PREFIX + key, code);
}
export function clearDraft(key: string) {
  localStorage.removeItem(PREFIX + key);
}
