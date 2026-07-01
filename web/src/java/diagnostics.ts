import type { Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

export type JavaDiagnostic = {
  file: string;
  line: number;
  column: number;
  severity: "error" | "warning";
  message: string;
};

const MARKER_OWNER = "java-compile";

export async function fetchJavaDiagnostics(
  files: { name: string; content: string }[],
  signal?: AbortSignal
): Promise<JavaDiagnostic[]> {
  const res = await fetch("/api/java-compile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files }),
    signal,
  });
  const data = await res.json();
  return Array.isArray(data?.diagnostics) ? (data.diagnostics as JavaDiagnostic[]) : [];
}

// Map javac diagnostics for one file onto the mounted model. javac reports a
// line and a caret column but no end, so we squiggle from the caret to the end
// of that line.
export function applyJavaMarkers(
  monaco: Monaco,
  model: editor.ITextModel,
  fileName: string,
  diagnostics: JavaDiagnostic[]
) {
  const base = fileName.replace(/^.*\//, "");
  const markers: editor.IMarkerData[] = diagnostics
    .filter((d) => d.file === base)
    .map((d) => {
      const line = Math.min(Math.max(d.line, 1), model.getLineCount());
      const startColumn = Math.max(d.column, 1);
      return {
        severity: d.severity === "error" ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
        startLineNumber: line,
        startColumn,
        endLineNumber: line,
        endColumn: Math.max(model.getLineMaxColumn(line), startColumn + 1),
        message: d.message,
        source: "javac",
      };
    });
  monaco.editor.setModelMarkers(model, MARKER_OWNER, markers);
}

export function clearJavaMarkers(monaco: Monaco, model: editor.ITextModel) {
  monaco.editor.setModelMarkers(model, MARKER_OWNER, []);
}
