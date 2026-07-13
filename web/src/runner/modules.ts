import * as React from "react";
import * as ReactDOMClient from "react-dom/client";
import * as JsxRuntime from "react/jsx-runtime";
import userEvent from "@testing-library/user-event";
import { rtl } from "./rtl";
import { transpile } from "./transpile";
import { evalModule } from "./evalModule";

// Re-exported so existing importers (`./modules`) keep working unchanged while
// the worker path imports the DOM-free original from `./evalModule` directly.
export { evalModule };

// The only modules an exercise is allowed to import. They're the app's own
// bundled copies, so the learner's React shares one instance with RTL. The RTL
// here is sandboxed (see rtl.ts) so tests don't touch the IDE's own DOM.
const REGISTRY: Record<string, unknown> = {
  react: React,
  "react-dom": ReactDOMClient,
  "react-dom/client": ReactDOMClient,
  "react/jsx-runtime": JsxRuntime,
  "@testing-library/react": rtl,
  "@testing-library/user-event": userEvent,
};

function normalizeLocalModuleName(name: string): string {
  return name.replace(/\.(tsx?|jsx?)$/, "").replace(/^\.\//, "/");
}

// A learner-created (or author-shipped) file that lives only in the browser IDE.
// `name` is a flat filename like "theme.css" / "helper.tsx"; `content` is its text.
export type LearnerFiles = Record<string, string>;

// Strip a leading "./" and normalize away extensions so we can match a bare
// specifier ("./helper") against a filename key ("helper.tsx").
function importBaseName(name: string): string {
  return name.replace(/^\.\//, "").replace(/\.(tsx?|jsx?|css)$/, "");
}

// Extension-resolution order for a bare relative import, mirroring a real bundler:
// exact match first, then .tsx, .ts, .css.
const RESOLVE_EXTS = ["", ".tsx", ".ts", ".css"];

function resolveLearnerFileName(spec: string, files: LearnerFiles): string | undefined {
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

// Apply an imported CSS file by injecting (or updating) a dedicated <style> tag
// per file id, so multiple imported stylesheets coexist. Because the IDE renders
// exercises into a real (sandboxed) DOM, this makes getComputedStyle reflect the
// CSS — which is how the CSS levels are graded deterministically. Idempotent:
// one tag per name, replaced in place. Only ever called for CSS that is actually
// imported (side-effect import), matching real bundler semantics.
export function installCss(cssText: string, id = "exercise-styles") {
  if (typeof document === "undefined") return;
  let tag = document.getElementById(id) as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement("style");
    tag.id = id;
    document.head.appendChild(tag);
  }
  tag.textContent = cssText;
}

const LEARNER_CSS_TAG_PREFIX = "exercise-style-";

function cssTagId(fileName: string): string {
  // Keep the author-shipped styles.css on the historical id so its behavior is
  // byte-for-byte unchanged; give learner CSS files their own per-name tags.
  return fileName === "styles.css" ? "exercise-styles" : `${LEARNER_CSS_TAG_PREFIX}${fileName}`;
}

// Remove every learner-CSS <style> tag before a fresh compile so a stylesheet that
// is no longer imported stops applying (real bundler semantics: only side-effect
// imports that still run inject CSS). The author styles.css tag ("exercise-styles")
// is intentionally NOT cleared here — it's managed in place, unchanged from before.
export function clearLearnerCss() {
  if (typeof document === "undefined") return;
  const tags = document.querySelectorAll(`style[id^="${LEARNER_CSS_TAG_PREFIX}"]`);
  tags.forEach((tag) => tag.remove());
}

export interface RequireOptions {
  // Extra in-memory modules (e.g. { "./solution": solutionExports }) resolved by
  // exact specifier, same as before.
  locals?: Record<string, unknown>;
  // Author-shipped styles.css text. When present, a bare `import "./styles.css"`
  // (or the styles.css entry in learnerFiles) injects it under the legacy tag id.
  css?: string;
  // The learner-created file map: { "theme.css": "...", "helper.tsx": "..." }.
  learnerFiles?: LearnerFiles;
  // Extra globals injected into evaluated learner modules (e.g. captured console).
  moduleGlobals?: Record<string, unknown>;
}

export function makeRequire(
  localsOrOptions: Record<string, unknown> | RequireOptions = {},
  css?: string
): (name: string) => unknown {
  // Backward-compatible overloads: makeRequire(locals, css) OR makeRequire(options).
  const options: RequireOptions =
    "locals" in localsOrOptions ||
    "css" in localsOrOptions ||
    "learnerFiles" in localsOrOptions ||
    "moduleGlobals" in localsOrOptions
      ? (localsOrOptions as RequireOptions)
      : { locals: localsOrOptions as Record<string, unknown>, css };

  const locals = options.locals ?? {};
  const cssText = options.css ?? css;
  const moduleGlobals = options.moduleGlobals ?? {};

  // Merge author styles.css into the learner file map so it resolves through one
  // uniform path. An explicit learnerFiles["styles.css"] (an edited draft) wins.
  const learnerFiles: LearnerFiles = { ...(options.learnerFiles ?? {}) };
  if (cssText !== undefined && !("styles.css" in learnerFiles)) {
    learnerFiles["styles.css"] = cssText;
  }

  const normalizedLocals = new Map<string, unknown>();
  for (const [name, value] of Object.entries(locals)) {
    normalizedLocals.set(name, value);
    normalizedLocals.set(normalizeLocalModuleName(name), value);
  }

  // Module cache so a learner module imported by two files evaluates once, and so
  // an import cycle terminates instead of recursing forever.
  const moduleCache = new Map<string, Record<string, unknown>>();

  const require = (name: string): unknown => {
    // Exact in-memory locals (e.g. "./solution") take priority.
    if (name in locals) return locals[name];

    // Relative import into the learner-file map (flat, same-folder).
    if (name.startsWith("./")) {
      const fileName = resolveLearnerFileName(name, learnerFiles);
      if (fileName !== undefined) {
        // CSS: side-effect import — inject the <style> and return an empty module.
        if (fileName.endsWith(".css")) {
          installCss(learnerFiles[fileName], cssTagId(fileName));
          return {};
        }
        // TS/TSX module: transpile + evaluate through the same require chain,
        // caching by resolved filename so cycles terminate.
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
        // Copy the real exports onto the pre-seeded object so any live cyclic ref
        // observes them, then cache/return the same identity.
        Object.assign(exportsObj, evaluated);
        moduleCache.set(fileName, exportsObj);
        return exportsObj;
      }
      // A bare `import "./styles.css"` with no learner map still works via cssText.
      if (name.endsWith(".css") && cssText !== undefined) {
        installCss(cssText);
        return {};
      }
    }

    // Any other .css import (non-relative or unmatched) is a no-op side-effect.
    if (name.endsWith(".css")) {
      if (cssText !== undefined) installCss(cssText);
      return {};
    }

    const normalizedName = normalizeLocalModuleName(name);
    if (normalizedLocals.has(normalizedName)) return normalizedLocals.get(normalizedName);
    if (name in REGISTRY) return REGISTRY[name];
    throw new Error(`Module not available in the exercise sandbox: "${name}"`);
  };

  return require;
}
