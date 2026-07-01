export type ConsoleLevel = "log" | "info" | "warn" | "error";

export interface ConsoleEntry {
  id: number;
  level: ConsoleLevel;
  source: "tests" | "preview" | "run";
  args: string[];
}

export type ConsoleSink = (entry: Omit<ConsoleEntry, "id">) => void;

function makeReplacer() {
  const seen = new WeakSet<object>();
  return function replacer(this: unknown, _key: string, value: unknown): unknown {
    if (typeof value === "bigint") return `${value}n`;
    if (typeof value === "symbol") return value.toString();
    if (typeof value === "function") {
      return `[Function: ${value.name || "anonymous"}]`;
    }
    if (value instanceof Map) {
      return { "[Map]": [...value.entries()] };
    }
    if (value instanceof Set) {
      return { "[Set]": [...value] };
    }
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) return "[Circular]";
      seen.add(value);
    }
    return value;
  };
}

function formatArg(arg: unknown): string {
  if (typeof arg === "string") return arg;
  if (arg instanceof Error) return arg.stack || arg.message;
  if (arg === undefined) return "undefined";
  if (typeof arg === "function") return `[Function: ${arg.name || "anonymous"}]`;
  if (typeof arg === "symbol") return arg.toString();
  if (typeof arg === "bigint") return `${arg}n`;
  try {
    const out = JSON.stringify(arg, makeReplacer(), 2);
    // JSON.stringify returns undefined for values it can't represent at top level.
    return out === undefined ? String(arg) : out;
  } catch {
    return String(arg);
  }
}

export function makeCapturedConsole(source: ConsoleEntry["source"], sink?: ConsoleSink): Console {
  const captured = {} as Console;
  const base = globalThis.console;

  (["log", "info", "warn", "error"] as const).forEach((level) => {
    captured[level] = (...args: unknown[]) => {
      sink?.({ source, level, args: args.map(formatArg) });
      base[level]?.(...args);
    };
  });

  return new Proxy(base, {
    get(target, prop) {
      if (prop in captured) return captured[prop as keyof Console];
      return target[prop as keyof Console];
    },
  }) as Console;
}
