import { useMemo, useRef, useState } from "react";
import { exportState, importState, parseTransfer, summarizeTransfer } from "./transfer";

// Copy-paste transfer of all app state between browsers. Export fills the
// textarea with the JSON envelope (copy it in the old browser); Import parses
// whatever was pasted, previews what it contains, and only writes on the
// explicit Import click, then reloads so every panel re-reads storage.
export function TransferModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<{ kind: "info" | "error" | "ok"; msg: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Re-validate on every edit so the Import button + preview track the paste.
  const parsed = useMemo(() => {
    if (!text.trim()) return null;
    try {
      return { env: parseTransfer(text), error: null as string | null };
    } catch (e) {
      return { env: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [text]);

  const doExport = () => {
    const json = exportState();
    setText(json);
    setStatus(null);
    // Select everything so a manual ⌘C works even if clipboard access fails.
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    });
  };

  const doCopy = async () => {
    const json = text.trim() ? text : exportState();
    if (!text.trim()) setText(json);
    try {
      await navigator.clipboard.writeText(json);
      setStatus({ kind: "ok", msg: "Copied. Paste it into this dialog in the other browser." });
    } catch {
      textareaRef.current?.focus();
      textareaRef.current?.select();
      setStatus({ kind: "info", msg: "Clipboard blocked — the text is selected, press ⌘/Ctrl+C." });
    }
  };

  const doDownload = () => {
    const json = text.trim() ? text : exportState();
    if (!text.trim()) setText(json);
    const stamp = new Date().toISOString().slice(0, 10);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `code-exercises-export-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doLoadFile = (file: File) => {
    file
      .text()
      .then((content) => {
        setText(content);
        setStatus(null);
      })
      .catch((e) => setStatus({ kind: "error", msg: `Could not read the file. (${e?.message ?? e})` }));
  };

  const doImport = () => {
    if (!parsed?.env) return;
    try {
      const written = importState(parsed.env);
      setStatus({ kind: "ok", msg: `Imported ${written} entries. Reloading…` });
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      setStatus({ kind: "error", msg: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <div className="transfer-backdrop" onClick={onClose}>
      <div
        className="transfer-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Export or import exercise data"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="transfer-head">
          <strong>Export / Import</strong>
          <button className="reset" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <p className="muted transfer-blurb">
          Moves ALL exercise data — progress, code drafts and their history, added files, scores,
          reviews, chats, timers — between browsers. In the old browser: Export, then Copy. In the
          new one: paste below, then Import. Imported entries overwrite matching ones here.
        </p>

        <div className="transfer-actions">
          <button className="reset" onClick={doExport}>
            Export to text
          </button>
          <button className="reset" onClick={doCopy}>
            Copy
          </button>
          <button className="reset" onClick={doDownload}>
            Download .json
          </button>
          <label className="reset transfer-file">
            Load file…
            <input
              type="file"
              accept="application/json,.json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) doLoadFile(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        <textarea
          ref={textareaRef}
          className="transfer-text"
          placeholder='Click "Export to text" here, or paste an export from your other browser.'
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setStatus(null);
          }}
          spellCheck={false}
        />

        {parsed?.error && <p className="transfer-status error">{parsed.error}</p>}
        {parsed?.env && <p className="transfer-status">{summarizeTransfer(parsed.env)}</p>}
        {status && <p className={`transfer-status ${status.kind}`}>{status.msg}</p>}

        <div className="transfer-actions">
          <button
            className={`submit transfer-import ${parsed?.env ? "ready" : ""}`}
            disabled={!parsed?.env}
            title={parsed?.env ? "Write these entries into this browser" : "Paste a valid export first"}
            onClick={doImport}
          >
            Import into this browser
          </button>
        </div>
      </div>
    </div>
  );
}
