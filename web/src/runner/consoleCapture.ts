export type ConsoleLevel = "log" | "info" | "warn" | "error";

export interface ConsoleEntry {
  id: number;
  level: ConsoleLevel;
  source: "tests" | "preview";
  args: string[];
}

export type ConsoleSink = (entry: Omit<ConsoleEntry, "id">) => void;

function formatArg(arg: unknown): string {
  if (typeof arg === "string") return arg;
  if (arg instanceof Error) return arg.stack || arg.message;
  try {
    return JSON.stringify(arg, null, 2);
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
