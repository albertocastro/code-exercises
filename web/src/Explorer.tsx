export interface FileEntry {
  id: string;
  name: string;
  readOnly: boolean;
  // Learner-created files can be deleted; author-shipped files cannot.
  deletable?: boolean;
}

const ICON: Record<string, string> = {
  solution: "›_",
  test: "✓",
  preview: "▦",
  perf: "⚡",
  styles: "#",
  main: "▶",
};

function iconFor(entry: FileEntry): string {
  if (ICON[entry.id]) return ICON[entry.id];
  if (entry.name.endsWith(".css")) return "#";
  if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) return "›_";
  return "•";
}

export function Explorer({
  files,
  active,
  collapsed,
  onToggle,
  onSelect,
  onAddFile,
  onDeleteFile,
}: {
  files: FileEntry[];
  active: string;
  collapsed: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onAddFile?: () => void;
  onDeleteFile?: (id: string) => void;
}) {
  return (
    <div className={`explorer ${collapsed ? "collapsed" : ""}`}>
      <div className="explorer-head">
        {!collapsed && <span>FILES</span>}
        {!collapsed && onAddFile && (
          <button
            className="explorer-add"
            title="Add a new file (.css, .ts, .tsx)"
            aria-label="Add a new file"
            onClick={onAddFile}
          >
            + Add file
          </button>
        )}
        <button
          className="explorer-toggle"
          title={collapsed ? "Show files" : "Hide files"}
          onClick={onToggle}
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>
      {!collapsed &&
        files.map((f) => (
          <div key={f.id} className={`file-row ${active === f.id ? "active" : ""}`}>
            <button
              className={`file ${active === f.id ? "active" : ""}`}
              onClick={() => onSelect(f.id)}
            >
              <span className="file-icon">{iconFor(f)}</span>
              <span className="file-name">{f.name}</span>
              {f.readOnly && <span className="ro">ro</span>}
            </button>
            {f.deletable && onDeleteFile && (
              <button
                className="file-delete"
                title={`Delete ${f.name}`}
                aria-label={`Delete ${f.name}`}
                onClick={() => onDeleteFile(f.id)}
              >
                ×
              </button>
            )}
          </div>
        ))}
    </div>
  );
}
