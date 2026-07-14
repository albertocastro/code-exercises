// DOM-free resolution of learner-created same-folder modules. Both the React
// main-thread runner (via ./modules) and the leetcode Web Worker runner (via
// ./testWorker) need to make a `import { x } from "./helper"` in the solution or
// test resolve to a learner file's contents. This module holds the parts that
// touch NO DOM (transpile + eval + a module cache), so the worker can import it
// without dragging in rtl.ts (whose top-level document.* would crash a worker).
//
// The React path additionally injects imported CSS into the page; that DOM-bound
// piece stays in ./modules. Here, a `.css` import is an inert no-op — leetcode has
// no styles, and the worker has no DOM to style.

import { transpile } from "./transpile";
import { evalModule } from "./evalModule";

// A learner-created (or author-shipped) file that lives only in the browser IDE.
// `name` is a flat filename like "helper.ts"; the value is its source text.
export type LearnerFiles = Record<string, string>;

// Extension-resolution order for a bare relative import, mirroring a real bundler:
// exact match first, then .tsx, .ts. (.css is matched explicitly by exact name.)
const RESOLVE_EXTS = ["", ".tsx", ".ts", ".css"];

// Strip a leading "./" and drop a code/style extension so a bare specifier
// ("./helper") can match a filename key ("helper.ts").
function importBaseName(name: string): string {
  return name.replace(/^\.\//, "").replace(/\.(tsx?|jsx?|css)$/, "");
}

// Map a relative specifier to a learner filename key, or undefined if none match.
export function resolveLearnerFileName(spec: string, files: LearnerFiles): string | undefined {
  const stripped = spec.replace(/^\.\//, "");
  // Exact filename (with extension) wins.
  if (stripped in files) return stripped;
  const base = importBaseName(spec);
  for (const ext of RESOLVE_EXTS) {
    const candidate = base + ext;
    if (candidate in files) return candidate;
  }
  return undefined;
}

// Build a require that resolves same-folder learner .ts/.tsx modules and delegates
// everything else to `fallback`. A module cache keyed by resolved filename makes a
// file imported by two others evaluate once AND makes an import cycle terminate:
// the in-progress exports object is seeded into the cache before evaluation, so a
// cyclic self-reference observes the partial exports instead of recursing forever.
export function makeLearnerRequire(opts: {
  learnerFiles: LearnerFiles;
  // Resolver for anything that isn't a learner file (locals like "./solution",
  // allowlisted packages, or the "module not available" throw).
  fallback: (name: string) => unknown;
  // Extra globals injected into each evaluated learner module (e.g. console).
  moduleGlobals?: Record<string, unknown>;
}): (name: string) => unknown {
  const { learnerFiles, fallback, moduleGlobals = {} } = opts;
  const moduleCache = new Map<string, Record<string, unknown>>();

  const require = (name: string): unknown => {
    if (name.startsWith("./")) {
      const fileName = resolveLearnerFileName(name, learnerFiles);
      if (fileName !== undefined) {
        // No DOM in this path: an imported .css is an inert no-op side effect.
        if (fileName.endsWith(".css")) return {};
        const cached = moduleCache.get(fileName);
        if (cached) return cached;
        const exportsObj: Record<string, unknown> = {};
        // Seed the cache BEFORE evaluating so a cyclic self-reference resolves to
        // the in-progress exports object rather than recursing.
        moduleCache.set(fileName, exportsObj);
        const evaluated = evalModule(
          transpile(learnerFiles[fileName], `/${fileName}`),
          require,
          moduleGlobals
        );
        // Copy real exports onto the pre-seeded object so any live cyclic ref sees
        // them, then return the same identity.
        Object.assign(exportsObj, evaluated);
        return exportsObj;
      }
    }
    return fallback(name);
  };
  return require;
}
