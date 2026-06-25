// Persist the learner's edited solution per exercise so work survives navigation
// and reloads. Keyed by `${categoryId}/${exerciseId}`.
const PREFIX = "code-exercises-draft:";
const HISTORY_PREFIX = "code-exercises-draft-history:";
const HISTORY_LIMIT = 10;

export interface DraftRevision {
  code: string;
  savedAt: number;
}

export function getDraft(key: string): string | null {
  return localStorage.getItem(PREFIX + key);
}
export function saveDraft(key: string, code: string) {
  localStorage.setItem(PREFIX + key, code);
}
export function clearDraft(key: string) {
  localStorage.removeItem(PREFIX + key);
}

export function getDraftHistory(key: string): DraftRevision[] {
  try {
    const raw = localStorage.getItem(HISTORY_PREFIX + key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DraftRevision[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDraftSnapshot(key: string, code: string, savedAt = Date.now()) {
  const next = getDraftHistory(key);
  if (next[0]?.code === code) return next;
  const updated = [{ code, savedAt }, ...next].slice(0, HISTORY_LIMIT);
  localStorage.setItem(HISTORY_PREFIX + key, JSON.stringify(updated));
  return updated;
}
