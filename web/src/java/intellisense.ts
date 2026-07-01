import type { Monaco } from "@monaco-editor/react";
import {
  JAVA_KEYWORDS,
  JAVA_SNIPPETS,
  STATIC_ONLY,
  STDLIB,
  TYPE_ALIASES,
  type Member,
} from "./stdlib";

// Sibling Java sources (the files NOT currently mounted in the editor). Because
// the editor remounts per file, a single model can't see the other files' code
// — so the Workspace pushes all of the exercise's Java sources here, letting
// completion resolve e.g. `SafeCounter`'s methods while you edit Main.java.
let siblingSources: string[] = [];
export function setJavaSources(sources: string[]) {
  siblingSources = sources.filter(Boolean);
}

type UserClass = { name: string; methods: Member[] };

function parseUserClasses(sources: string[]): UserClass[] {
  const classes: UserClass[] = [];
  const classRe = /\bclass\s+(\w+)/g;
  const methodRe =
    /\b(?:public|private|protected)\s+(?:static\s+|final\s+|synchronized\s+|abstract\s+)*([\w<>\[\],.]+)\s+(\w+)\s*\(([^)]*)\)/g;
  for (const src of sources) {
    // Map each class name to the source offset where it starts, so a method can
    // be attributed to the nearest class declared before it.
    const bounds: { name: string; at: number }[] = [];
    let cm: RegExpExecArray | null;
    classRe.lastIndex = 0;
    while ((cm = classRe.exec(src))) bounds.push({ name: cm[1], at: cm.index });
    const owner = (at: number) => {
      let best: string | null = null;
      for (const b of bounds) if (b.at <= at) best = b.name;
      return best;
    };
    const byName = new Map<string, UserClass>();
    let mm: RegExpExecArray | null;
    methodRe.lastIndex = 0;
    while ((mm = methodRe.exec(src))) {
      const [, ret, name, params] = mm;
      if (ret === "new" || name === "new") continue;
      const cls = owner(mm.index) ?? "";
      if (!cls) continue;
      let uc = byName.get(cls);
      if (!uc) {
        uc = { name: cls, methods: [] };
        byName.set(cls, uc);
      }
      if (!uc.methods.some((x) => x.name === name)) {
        uc.methods.push({ name, detail: `${ret} ${name}(${params.trim()})` });
      }
    }
    for (const uc of byName.values()) classes.push(uc);
  }
  return classes;
}

// Best-effort `var -> Type` map from declarations like `SafeCounter c = ...`,
// `AtomicInteger n;`, `List<String> xs = ...`. Primitive-typed locals are
// intentionally skipped (they have no members to complete).
function parseVarTypes(sources: string[]): Map<string, string> {
  const map = new Map<string, string>();
  const declRe = /\b([A-Z]\w*)(?:\s*<[^>;={}()]*>)?\s+([a-z_]\w*)\s*(?==|;|,|\)|:)/g;
  for (const src of sources) {
    let m: RegExpExecArray | null;
    declRe.lastIndex = 0;
    while ((m = declRe.exec(src))) {
      if (m[1] === "new") continue;
      map.set(m[2], m[1]);
    }
  }
  return map;
}

function enclosingClass(text: string, offset: number): string | null {
  const re = /\bclass\s+(\w+)/g;
  let m: RegExpExecArray | null;
  let name: string | null = null;
  while ((m = re.exec(text)) && m.index < offset) name = m[1];
  return name;
}

function membersOfType(type: string, userClasses: UserClass[]): Member[] {
  const base = TYPE_ALIASES[type] ?? type;
  const uc = userClasses.find((c) => c.name === base || c.name === type);
  if (uc) return uc.methods;
  return STDLIB[base]?.members ?? [];
}

function staticsOfType(type: string, userClasses: UserClass[]): Member[] {
  const uc = userClasses.find((c) => c.name === type);
  if (uc) return uc.methods; // user classes: offer methods for Foo.bar too
  return STATIC_ONLY[type]?.statics ?? STDLIB[type]?.statics ?? [];
}

// The `monaco` namespace is a frozen ES module object, so we can't tag it —
// track which instances we've registered against in a WeakSet instead.
const installedFor = new WeakSet<object>();

export function installJavaIntelliSense(monaco: Monaco) {
  if (installedFor.has(monaco)) return;
  installedFor.add(monaco);

  const L = monaco.languages;
  const Kind = L.CompletionItemKind;

  L.registerCompletionItemProvider("java", {
    triggerCharacters: ["."],
    provideCompletionItems(model, position) {
      const text = model.getValue();
      const allSources = [text, ...siblingSources];
      const userClasses = parseUserClasses(allSources);
      const varTypes = parseVarTypes(allSources);

      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const line = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
      const memberAccess = /(\w+)\s*\.\s*(\w*)$/.exec(line);

      const toItem = (mem: Member, kind: number) => ({
        label: mem.name,
        kind,
        detail: mem.detail,
        documentation: mem.doc,
        // Method members insert a call with the cursor between the parens.
        insertText:
          kind === Kind.Method && mem.detail.includes("(")
            ? mem.detail.includes("()")
              ? `${mem.name}()`
              : `${mem.name}($0)`
            : mem.name,
        insertTextRules:
          kind === Kind.Method ? L.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
        range,
      });

      if (memberAccess) {
        const recv = memberAccess[1];
        let members: Member[] = [];
        if (recv === "this") {
          const cls = enclosingClass(text, model.getOffsetAt(position));
          members = cls ? membersOfType(cls, userClasses) : [];
        } else if (varTypes.has(recv)) {
          members = membersOfType(varTypes.get(recv)!, userClasses);
        } else {
          members = staticsOfType(recv, userClasses);
        }
        return { suggestions: members.map((mem) => toItem(mem, Kind.Method)) };
      }

      // General (non-member) completion.
      const suggestions: ReturnType<typeof toItem>[] = [];
      for (const k of JAVA_KEYWORDS) {
        suggestions.push({
          label: k,
          kind: Kind.Keyword,
          detail: "keyword",
          documentation: undefined,
          insertText: k,
          insertTextRules: undefined,
          range,
        });
      }
      for (const s of JAVA_SNIPPETS) {
        suggestions.push({
          label: s.label,
          kind: Kind.Snippet,
          detail: s.doc,
          documentation: undefined,
          insertText: s.insertText,
          insertTextRules: L.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        });
      }
      const classNames = new Set<string>([
        ...Object.keys(STDLIB),
        ...Object.keys(STATIC_ONLY),
        ...Object.keys(TYPE_ALIASES),
        ...userClasses.map((c) => c.name),
      ]);
      for (const name of classNames) {
        suggestions.push({
          label: name,
          kind: Kind.Class,
          detail: "class",
          documentation: STDLIB[name]?.doc ?? STATIC_ONLY[name]?.doc,
          insertText: name,
          insertTextRules: undefined,
          range,
        });
      }
      for (const [name] of varTypes) {
        suggestions.push({
          label: name,
          kind: Kind.Variable,
          detail: varTypes.get(name),
          documentation: undefined,
          insertText: name,
          insertTextRules: undefined,
          range,
        });
      }
      return { suggestions };
    },
  });

  L.registerHoverProvider("java", {
    provideHover(model, position) {
      const word = model.getWordAtPosition(position);
      if (!word) return null;
      const name = word.word;
      const allSources = [model.getValue(), ...siblingSources];

      // A class/type name?
      const cls = STDLIB[name] ?? STATIC_ONLY[name];
      if (cls?.doc || STDLIB[name] || STATIC_ONLY[name]) {
        const doc = cls?.doc ?? `Java type \`${name}\``;
        return { contents: [{ value: `**${name}**` }, { value: doc }] };
      }

      // A member? Look at what precedes the word on this line.
      const line = model.getLineContent(position.lineNumber).slice(0, word.startColumn - 1);
      const recvMatch = /(\w+)\s*\.\s*$/.exec(line);
      if (recvMatch) {
        const userClasses = parseUserClasses(allSources);
        const varTypes = parseVarTypes(allSources);
        const recv = recvMatch[1];
        let members: Member[] = [];
        if (recv === "this") {
          const c = enclosingClass(model.getValue(), model.getOffsetAt(position));
          members = c ? membersOfType(c, userClasses) : [];
        } else if (varTypes.has(recv)) {
          members = membersOfType(varTypes.get(recv)!, userClasses);
        } else {
          members = staticsOfType(recv, userClasses);
        }
        const hit = members.find((mem) => mem.name === name);
        if (hit) return { contents: [{ value: "```java\n" + hit.detail + "\n```" }, ...(hit.doc ? [{ value: hit.doc }] : [])] };
      }

      // A user-defined method anywhere?
      const method = parseUserClasses(allSources)
        .flatMap((c) => c.methods)
        .find((mem) => mem.name === name);
      if (method) return { contents: [{ value: "```java\n" + method.detail + "\n```" }] };

      return null;
    },
  });
}
