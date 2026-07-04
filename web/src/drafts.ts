// Persist the learner's edited solution per exercise so work survives navigation
// and reloads. Keyed by `${categoryId}/${exerciseId}`.
const PREFIX = "code-exercises-draft:";
const HISTORY_PREFIX = "code-exercises-draft-history:";
const MAX_HISTORY = 40;

export type DraftFile = "solution" | "preview" | "styles" | "main";

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

// ── Learner-created files ──────────────────────────────────────────────────
// A learner can add their own files (CSS / .ts / .tsx) per exercise. These are
// browser-only (never written to disk, never shipped). We persist them under a
// separate namespace so the existing solution/preview/styles/main drafts above
// are untouched and backward compatible: an exercise with no learner files has
// no learner-file keys at all.
const LEARNER_INDEX_PREFIX = "code-exercises-learner-index:";
const LEARNER_FILE_PREFIX = "code-exercises-learner-file:";

function learnerIndexKey(key: string): string {
  return LEARNER_INDEX_PREFIX + key;
}

function learnerFileKey(key: string, name: string): string {
  return `${LEARNER_FILE_PREFIX}${key}:${name}`;
}

// The ordered list of learner filenames for an exercise.
export function getLearnerFileNames(key: string): string[] {
  try {
    const value = localStorage.getItem(learnerIndexKey(key));
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((n): n is string => typeof n === "string") : [];
  } catch {
    return [];
  }
}

function setLearnerFileNames(key: string, names: string[]) {
  localStorage.setItem(learnerIndexKey(key), JSON.stringify(names));
}

// The full { filename: content } map for an exercise, ready to hand to the runner.
export function getLearnerFiles(key: string): Record<string, string> {
  const files: Record<string, string> = {};
  for (const name of getLearnerFileNames(key)) {
    const content = localStorage.getItem(learnerFileKey(key, name));
    files[name] = content ?? "";
  }
  return files;
}

// Create or update a single learner file's content (adds it to the index if new).
export function saveLearnerFile(key: string, name: string, content: string) {
  const names = getLearnerFileNames(key);
  if (!names.includes(name)) setLearnerFileNames(key, [...names, name]);
  localStorage.setItem(learnerFileKey(key, name), content);
}

// Delete one learner file: drop it from the index and remove its content.
export function deleteLearnerFile(key: string, name: string) {
  setLearnerFileNames(
    key,
    getLearnerFileNames(key).filter((n) => n !== name)
  );
  localStorage.removeItem(learnerFileKey(key, name));
}

// Remove every learner file for an exercise (used by whole-exercise reset).
export function clearLearnerFiles(key: string) {
  for (const name of getLearnerFileNames(key)) {
    localStorage.removeItem(learnerFileKey(key, name));
  }
  localStorage.removeItem(learnerIndexKey(key));
}
