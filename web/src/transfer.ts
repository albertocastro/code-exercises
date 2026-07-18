// Export/import of ALL app state (progress, drafts, history, learner files,
// scores, reviews, chats, timers, layout prefs) so a learner can move between
// browsers. Everything the app persists lives in localStorage under keys
// starting with "code-exercises", so the export is simply that key subset,
// wrapped in a small versioned envelope. Designed for copy-paste transfer: the
// payload is a single JSON string.

const KEY_PREFIX = "code-exercises";

// Transient reload flags (see Workspace main-file reload plumbing) — meaningless
// in another browser, so they're excluded from exports.
const TRANSIENT_PREFIXES = ["code-exercises-main-reload:"];

const ENVELOPE_APP = "code-exercises";
const ENVELOPE_VERSION = 1;

export interface TransferEnvelope {
  app: typeof ENVELOPE_APP;
  version: number;
  exportedAt: string;
  entries: Record<string, string>;
}

function isTransient(key: string): boolean {
  return TRANSIENT_PREFIXES.some((p) => key.startsWith(p));
}

/** Serialize every persisted app key into a copy-pasteable JSON envelope. */
export function exportState(): string {
  const entries: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(KEY_PREFIX) || isTransient(key)) continue;
    const value = localStorage.getItem(key);
    if (value !== null) entries[key] = value;
  }
  const envelope: TransferEnvelope = {
    app: ENVELOPE_APP,
    version: ENVELOPE_VERSION,
    exportedAt: new Date().toISOString(),
    entries,
  };
  return JSON.stringify(envelope, null, 2);
}

/**
 * Parse + validate a pasted export. Throws an Error with a user-facing message
 * on anything that isn't a well-formed envelope. Foreign keys (not ours) are
 * rejected outright so a doctored payload can't write arbitrary localStorage.
 */
export function parseTransfer(text: string): TransferEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That doesn't look like valid JSON. Paste the whole export, unmodified.");
  }
  const env = parsed as Partial<TransferEnvelope> | null;
  if (!env || typeof env !== "object" || env.app !== ENVELOPE_APP) {
    throw new Error("This JSON wasn't produced by the code-exercises export.");
  }
  if (typeof env.version !== "number" || env.version > ENVELOPE_VERSION) {
    throw new Error(
      `This export is from a newer app version (v${env.version}). Update this app first.`
    );
  }
  if (!env.entries || typeof env.entries !== "object" || Array.isArray(env.entries)) {
    throw new Error("The export is missing its entries.");
  }
  for (const [key, value] of Object.entries(env.entries)) {
    if (!key.startsWith(KEY_PREFIX)) {
      throw new Error(`Unexpected key in export: "${key}". Only code-exercises data can be imported.`);
    }
    if (typeof value !== "string") {
      throw new Error(`Entry "${key}" is not a string. The export looks corrupted.`);
    }
  }
  return env as TransferEnvelope;
}

/** Human summary of what an envelope contains, shown before importing. */
export function summarizeTransfer(env: TransferEnvelope): string {
  const keys = Object.keys(env.entries);
  const drafts = keys.filter((k) => k.startsWith("code-exercises-draft:")).length;
  const hasProgress = keys.includes("code-exercises-progress-v1");
  const scores = keys.filter((k) => k.startsWith("code-exercises-quality-score:")).length;
  const parts = [`${keys.length} entries`];
  parts.push(hasProgress ? "progress included" : "no progress record");
  if (drafts) parts.push(`${drafts} solution draft${drafts === 1 ? "" : "s"}`);
  if (scores) parts.push(`${scores} quality score${scores === 1 ? "" : "s"}`);
  const when = Date.parse(env.exportedAt);
  if (Number.isFinite(when)) parts.push(`exported ${new Date(when).toLocaleString()}`);
  return parts.join(" · ");
}

/**
 * Write a validated envelope into localStorage (merge: imported keys overwrite,
 * everything else is left alone). Returns the number of keys written.
 */
export function importState(env: TransferEnvelope): number {
  let written = 0;
  for (const [key, value] of Object.entries(env.entries)) {
    if (isTransient(key)) continue;
    try {
      localStorage.setItem(key, value);
      written++;
    } catch (e) {
      throw new Error(
        `Import stopped after ${written} entries — the browser refused to store "${key}" ` +
          `(likely out of localStorage quota). (${e instanceof Error ? e.message : e})`
      );
    }
  }
  return written;
}
