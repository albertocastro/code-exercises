// Bundle Monaco locally (via Vite ?worker imports) instead of loading it from a
// CDN. This makes the editor work offline / behind content blockers and gives
// the full TypeScript language service, so .tsx gets proper JSX highlighting and
// IntelliSense.
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import { loader } from "@monaco-editor/react";

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === "typescript" || label === "javascript") return new tsWorker();
    if (label === "json") return new jsonWorker();
    if (label === "css" || label === "scss" || label === "less") return new cssWorker();
    if (label === "html" || label === "handlebars" || label === "razor") return new htmlWorker();
    return new editorWorker();
  },
};

// Point @monaco-editor/react at the bundled instance (no network loader).
loader.config({ monaco });

// Swap Monaco's tokenizer for Shiki (VS Code's TextMate grammars) so .tsx gets
// real JSX highlighting. We alias `typescript` to the `tsx` grammar so every
// model keeps the TypeScript language service (IntelliSense) while gaining
// JSX-aware colors. Loaded once, lazily.
type MonacoNS = typeof monaco;
let shikiPromise: Promise<void> | null = null;

export function installHighlighting(m: MonacoNS): Promise<void> {
  if (!shikiPromise) {
    shikiPromise = (async () => {
      const [{ createHighlighter }, { shikiToMonaco }] = await Promise.all([
        import("shiki"),
        import("@shikijs/monaco"),
      ]);
      const highlighter = await createHighlighter({
        themes: ["dark-plus"],
        langs: ["tsx", "javascript", "json"],
        langAlias: { typescript: "tsx" },
      });
      shikiToMonaco(highlighter, m);
    })();
  }
  return shikiPromise;
}
