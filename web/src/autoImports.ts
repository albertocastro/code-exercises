import type { Monaco } from "@monaco-editor/react";
import type * as monacoNs from "monaco-editor";

// VS Code-style auto-imports for the in-browser editor.
//
// Monaco's bundled TypeScript worker does NOT offer auto-import completions or
// "Add import" quick-fixes out of the box: its SuggestAdapter calls
// getCompletionsAtPosition without `includeCompletionsForModuleExports`, and it
// registers no code-action provider for TS quick-fixes. On top of that, this
// editor runs with semantic validation off and (on this branch) without the
// React .d.ts loaded, so there are no "Cannot find name" diagnostics to hang a
// native quick-fix on. Rather than patch Monaco internals, we register our own
// CompletionItemProvider + CodeActionProvider keyed off a small curated map of
// well-known module exports (React hooks/types + react-dom), and merge the
// symbol into the file's existing import statement with a precise text edit.
//
// The import-merging logic (planImport / applyPlan) is pure and unit-tested in
// autoImports.test.ts — the Monaco wiring below is a thin adapter over it.

type KnownExport = { module: string; isType?: boolean };

// Curated list of the exports the exercises actually reach for. Kept small and
// correct on purpose; everything here is a *named* export (no defaults).
export const KNOWN_IMPORTS: Record<string, KnownExport> = {
  // ── react: hooks ──
  useState: { module: "react" },
  useEffect: { module: "react" },
  useRef: { module: "react" },
  useMemo: { module: "react" },
  useCallback: { module: "react" },
  useContext: { module: "react" },
  useReducer: { module: "react" },
  useLayoutEffect: { module: "react" },
  useImperativeHandle: { module: "react" },
  useId: { module: "react" },
  useTransition: { module: "react" },
  useDeferredValue: { module: "react" },
  useSyncExternalStore: { module: "react" },
  useInsertionEffect: { module: "react" },
  useDebugValue: { module: "react" },
  // ── react: values ──
  createContext: { module: "react" },
  forwardRef: { module: "react" },
  memo: { module: "react" },
  lazy: { module: "react" },
  Suspense: { module: "react" },
  Fragment: { module: "react" },
  StrictMode: { module: "react" },
  Children: { module: "react" },
  cloneElement: { module: "react" },
  createElement: { module: "react" },
  isValidElement: { module: "react" },
  startTransition: { module: "react" },
  createRef: { module: "react" },
  Component: { module: "react" },
  PureComponent: { module: "react" },
  // ── react: types ──
  FC: { module: "react", isType: true },
  FunctionComponent: { module: "react", isType: true },
  ReactNode: { module: "react", isType: true },
  ReactElement: { module: "react", isType: true },
  ComponentProps: { module: "react", isType: true },
  ComponentPropsWithoutRef: { module: "react", isType: true },
  ComponentPropsWithRef: { module: "react", isType: true },
  PropsWithChildren: { module: "react", isType: true },
  CSSProperties: { module: "react", isType: true },
  Dispatch: { module: "react", isType: true },
  SetStateAction: { module: "react", isType: true },
  Ref: { module: "react", isType: true },
  RefObject: { module: "react", isType: true },
  MutableRefObject: { module: "react", isType: true },
  ForwardedRef: { module: "react", isType: true },
  Reducer: { module: "react", isType: true },
  Context: { module: "react", isType: true },
  Key: { module: "react", isType: true },
  ChangeEvent: { module: "react", isType: true },
  ChangeEventHandler: { module: "react", isType: true },
  FormEvent: { module: "react", isType: true },
  FormEventHandler: { module: "react", isType: true },
  MouseEvent: { module: "react", isType: true },
  MouseEventHandler: { module: "react", isType: true },
  KeyboardEvent: { module: "react", isType: true },
  KeyboardEventHandler: { module: "react", isType: true },
  FocusEvent: { module: "react", isType: true },
  ReactEventHandler: { module: "react", isType: true },
  // ── react-dom ──
  createPortal: { module: "react-dom" },
  flushSync: { module: "react-dom" },
};

// ── pure import-merging logic (no Monaco dependency) ──

export type ImportPlan =
  | { case: "present" }
  | { case: "merge" | "default" | "new"; offset: number; insert: string };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detectQuote(code: string): '"' | "'" {
  const match = code.match(/import[^\n]*?from\s*(['"])/);
  return match ? (match[1] as '"' | "'") : '"';
}

function detectSemicolon(code: string): boolean {
  const match = code.match(/^\s*import[^\n]*?from\s*['"][^'"]+['"]\s*(;?)/m);
  return match ? match[1] === ";" : true;
}

// Names already pulled in by a specifier token like `useState`, `type Foo`, or
// `foo as bar` (both the source name and the local alias count as "present").
function specifierNames(token: string): string[] {
  const cleaned = token.replace(/^type\s+/, "").trim();
  if (!cleaned) return [];
  const asMatch = cleaned.match(/^(\S+)\s+as\s+(\S+)$/);
  return asMatch ? [asMatch[1], asMatch[2]] : [cleaned];
}

// Pick the import statement for `module`, preferring one that already has a
// `{ ... }` named-imports group so we can merge into it.
function findModuleImport(code: string, module: string): { stmt: string; start: number } | null {
  const re = new RegExp(`import\\s+([\\s\\S]*?)\\s+from\\s+(['"])${escapeRegExp(module)}\\2`, "g");
  let chosen: { stmt: string; start: number } | null = null;
  let match: RegExpExecArray | null;
  while ((match = re.exec(code))) {
    const candidate = { stmt: match[0], start: match.index };
    if (candidate.stmt.includes("{")) return candidate; // best: has a named group
    chosen = chosen ?? candidate;
  }
  return chosen;
}

/**
 * Plan how to bring `symbol` (from `module`) into scope for `code`.
 * - "present": already imported → no-op.
 * - "merge":   existing `{ ... }` named import → insert the symbol into it.
 * - "default": existing default/`import X from` → add a `{ ... }` group.
 * - "new":     no usable import → insert a fresh import line at the top.
 */
export function planImport(code: string, symbol: string, module: string, isType = false): ImportPlan {
  const found = findModuleImport(code, module);
  const quote = detectQuote(code);
  const semi = detectSemicolon(code) ? ";" : "";

  if (!found) {
    const spec = isType ? `type ${symbol}` : symbol;
    return { case: "new", offset: 0, insert: `import { ${spec} } from ${quote}${module}${quote}${semi}\n` };
  }

  const { stmt, start } = found;
  const braceOpen = stmt.indexOf("{");

  if (braceOpen !== -1) {
    const braceClose = stmt.indexOf("}", braceOpen);
    const inner = stmt.slice(braceOpen + 1, braceClose);
    const tokens = inner.split(",").map((t) => t.trim()).filter(Boolean);
    const present = tokens.some((t) => specifierNames(t).includes(symbol));
    // A `default` name before the braces (e.g. `import React, { ... }`) also counts.
    const beforeBrace = stmt.slice(0, braceOpen).replace(/^import\s+/, "");
    const defaultName = beforeBrace.replace(/,\s*$/, "").trim();
    if (present || defaultName === symbol) return { case: "present" };

    // `import type { ... }` already makes every specifier a type — don't re-prefix.
    const wholeTypeImport = /^import\s+type\b/.test(stmt);
    const spec = isType && !wholeTypeImport ? `type ${symbol}` : symbol;

    // Insert right after the last existing specifier (before any trailing
    // whitespace + `}`) so we don't produce `{ FC , ReactNode}` style spacing.
    const trimmedInner = inner.replace(/\s+$/, "");
    const offset = start + braceOpen + 1 + trimmedInner.length;
    let insert: string;
    if (trimmedInner.trim().length === 0) insert = spec; // `{}` → `{symbol}`
    else if (trimmedInner.endsWith(",")) insert = ` ${spec}`;
    else insert = `, ${spec}`;
    return { case: "merge", offset, insert };
  }

  // No braces: either a default import or a namespace import.
  const clauseMatch = stmt.match(/^import\s+([\s\S]*?)\s+from\b/);
  const clause = (clauseMatch?.[1] ?? "").trim();
  if (/^\*\s+as\b/.test(clause)) {
    // Namespace import (`import * as React from "react"`): can't be combined with a
    // named clause, so add a separate import line right after it.
    const spec = isType ? `type ${symbol}` : symbol;
    return { case: "new", offset: start + stmt.length, insert: `\nimport { ${spec} } from ${quote}${module}${quote}${semi}` };
  }
  // Default-only import: `import React from "react"` → `import React, { symbol } from ...`.
  if (clause === symbol) return { case: "present" };
  const spec = isType ? `type ${symbol}` : symbol;
  const offset = start + stmt.indexOf(clause) + clause.length;
  return { case: "default", offset, insert: `, { ${spec} }` };
}

/** Apply a plan to source text — used by tests and as a sanity helper. */
export function applyPlan(code: string, plan: ImportPlan): string {
  if (plan.case === "present") return code;
  return code.slice(0, plan.offset) + plan.insert + code.slice(plan.offset);
}

// ── Monaco wiring ──

let installed = false;

function planToEdits(
  monaco: Monaco,
  model: monacoNs.editor.ITextModel,
  plan: ImportPlan
): monacoNs.languages.TextEdit[] {
  if (plan.case === "present") return [];
  const pos = model.getPositionAt(plan.offset);
  return [
    {
      range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
      text: plan.insert,
    },
  ];
}

function makeCompletionProvider(monaco: Monaco): monacoNs.languages.CompletionItemProvider {
  return {
    provideCompletionItems(model, position) {
      const code = model.getValue();
      const word = model.getWordUntilPosition(position);
      const prefix = word.word;
      const replaceRange = new monaco.Range(
        position.lineNumber,
        word.startColumn,
        position.lineNumber,
        word.endColumn
      );
      const lower = prefix.toLowerCase();
      const suggestions: monacoNs.languages.CompletionItem[] = [];

      for (const [name, info] of Object.entries(KNOWN_IMPORTS)) {
        if (lower && !name.toLowerCase().startsWith(lower)) continue;
        const plan = planImport(code, name, info.module, info.isType);
        if (plan.case === "present") continue; // already in scope — nothing to add
        suggestions.push({
          label: name,
          kind: info.isType
            ? monaco.languages.CompletionItemKind.Interface
            : monaco.languages.CompletionItemKind.Function,
          detail: `Add import from "${info.module}"`,
          documentation: `Auto-import { ${name} } from "${info.module}"`,
          insertText: name,
          range: replaceRange,
          additionalTextEdits: planToEdits(monaco, model, plan),
          // Sort our auto-imports just after locally-available suggestions.
          sortText: `zz_${name}`,
        });
      }

      return { suggestions };
    },
  };
}

function makeCodeActionProvider(monaco: Monaco): monacoNs.languages.CodeActionProvider {
  return {
    provideCodeActions(model, range, context) {
      const code = model.getValue();
      const candidates = new Set<string>();

      // Prefer identifiers flagged by diagnostics (works when semantic validation
      // is on). Fall back to the identifier under the cursor so the lightbulb shows
      // even with diagnostics off.
      for (const marker of context.markers) {
        const w = model.getWordAtPosition({ lineNumber: marker.startLineNumber, column: marker.startColumn });
        if (w) candidates.add(w.word);
      }
      if (candidates.size === 0) {
        const w = model.getWordAtPosition({ lineNumber: range.startLineNumber, column: range.startColumn });
        if (w) candidates.add(w.word);
      }

      const actions: monacoNs.languages.CodeAction[] = [];
      for (const name of candidates) {
        const info = KNOWN_IMPORTS[name];
        if (!info) continue;
        const plan = planImport(code, name, info.module, info.isType);
        if (plan.case === "present") continue;
        const edits = planToEdits(monaco, model, plan).map((textEdit) => ({
          resource: model.uri,
          textEdit,
          versionId: model.getVersionId(),
        }));
        actions.push({
          title: `Add import { ${name} } from "${info.module}"`,
          kind: "quickfix",
          edit: { edits },
          diagnostics: [],
        });
      }

      return { actions, dispose() {} };
    },
  };
}

/** Register the auto-import completion + quick-fix providers (idempotent). */
export function installAutoImports(monaco: Monaco): void {
  if (installed) return;
  installed = true;
  for (const lang of ["typescript", "javascript"]) {
    monaco.languages.registerCompletionItemProvider(lang, makeCompletionProvider(monaco));
    monaco.languages.registerCodeActionProvider(lang, makeCodeActionProvider(monaco));
  }
}
