// Persist the learner's edited solution per exercise so work survives navigation
// and reloads. Keyed by `${categoryId}/${exerciseId}`.
const PREFIX = "code-exercises-draft:";
const HISTORY_PREFIX = "code-exercises-draft-history:";
const MAX_HISTORY = 40;

export type DraftFile = "solution" | "preview";

export interface DraftSnapshot {
  id: string;
  code: string;
  savedAt: number;
  label: string;
  file: DraftFile;
}

function storageKey(key: string, file: DraftFile = "solution"): string {
  return file === "solution" ? PREFIX + key : `${PREFIX}${file}:${key}`;
}

function historyKey(key: string, file: DraftFile = "solution"): string {
  return `${HISTORY_PREFIX}${file}:${key}`;
}

function readHistory(key: string, file: DraftFile = "solution"): DraftSnapshot[] {
  try {
    const value = localStorage.getItem(historyKey(key, file));
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHistory(key: string, file: DraftFile, entries: DraftSnapshot[]) {
  localStorage.setItem(historyKey(key, file), JSON.stringify(entries.slice(0, MAX_HISTORY)));
}

export function archiveDraft(
  key: string,
  code: string,
  file: DraftFile = "solution",
  label = "Saved"
) {
  if (!code.trim()) return;

  const current = readHistory(key, file);
  if (current[0]?.code === code) return;

  writeHistory(key, file, [
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      code,
      savedAt: Date.now(),
      label,
      file,
    },
    ...current,
  ]);
}

export function getDraft(key: string, file: DraftFile = "solution"): string | null {
  return localStorage.getItem(storageKey(key, file));
}

export function saveDraft(key: string, code: string, file: DraftFile = "solution") {
  const previous = getDraft(key, file);
  if (previous && previous !== code) archiveDraft(key, previous, file, "Before edit");
  localStorage.setItem(storageKey(key, file), code);
}

export function clearDraft(key: string, file: DraftFile = "solution", label = "Before reset") {
  const previous = getDraft(key, file);
  if (previous) archiveDraft(key, previous, file, label);
  localStorage.removeItem(storageKey(key, file));
}

export function getDraftHistory(key: string, file: DraftFile = "solution"): DraftSnapshot[] {
  return readHistory(key, file);
}
