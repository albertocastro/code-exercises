import { MarkerSeverity, type editor } from "monaco-editor";
import { transpile } from "./runner/transpile";

type ErrorWithLocation = Error & {
  line?: number;
  column?: number;
  loc?: { line?: number; column?: number };
};

function extractLocation(error: unknown) {
  const err = error as ErrorWithLocation;
  if (typeof err?.line === "number" && typeof err?.column === "number") {
    return { line: err.line, column: err.column };
  }
  if (typeof err?.loc?.line === "number" && typeof err?.loc?.column === "number") {
    return { line: err.loc.line, column: err.loc.column };
  }
  const message = err instanceof Error ? err.message : String(error);
  const match = message.match(/(\d+):(\d+)/);
  if (match) {
    return { line: Number(match[1]), column: Number(match[2]) };
  }
  return null;
}

export function getCompileMarkers(source: string, path: string): editor.IMarkerData[] {
  try {
    transpile(source, path);
    return [];
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const location = extractLocation(error);
    const line = location?.line ?? 1;
    const column = location?.column ?? 1;
    return [
      {
        severity: MarkerSeverity.Error,
        message: err.message,
        startLineNumber: line,
        startColumn: column,
        endLineNumber: line,
        endColumn: column + 1,
      },
    ];
  }
}
