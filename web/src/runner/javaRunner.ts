import type { ConsoleSink } from "./consoleCapture";
import type { RunResult } from "./testRunner";

export async function runJavaExercise(
  testCode: string | undefined,
  solutionCode: string,
  files: { solutionFileName?: string; testFileName?: string },
  level: number,
  onConsole?: ConsoleSink
): Promise<RunResult> {
  if (!testCode?.trim()) {
    return {
      rows: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      compileError: "Java is not available for this exercise yet.",
    };
  }

  try {
    const response = await fetch("/api/java-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ solutionCode, testCode, level, ...files }),
    });
    const data = await response.json();
    if (!data.ok) {
      return { rows: [], passed: 0, failed: 0, skipped: 0, compileError: data.error };
    }
    if (Array.isArray(data.console)) {
      data.console.forEach((line: unknown) => {
        if (typeof line === "string" && line.trim()) {
          onConsole?.({ source: "tests", level: "log", args: [line] });
        }
      });
    }
    return data.result;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      rows: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      compileError: `Java runner unavailable: ${message}`,
    };
  }
}

export async function runJavaMain(
  solutionCode: string,
  mainCode: string | undefined,
  files: { solutionFileName?: string; mainFileName?: string },
  onConsole?: ConsoleSink,
  signal?: AbortSignal
): Promise<void> {
  if (!mainCode?.trim()) {
    onConsole?.({ source: "run", level: "error", args: ["Main.java is not available for this exercise."] });
    return;
  }

  try {
    const response = await fetch("/api/java-main", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ solutionCode, mainCode, ...files }),
      signal,
    });
    if (!response.body) {
      throw new Error("Java run stream was not available.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.type === "stdout") {
          onConsole?.({ source: "run", level: "log", args: [String(event.text)] });
        } else if (event.type === "stderr") {
          onConsole?.({ source: "run", level: "error", args: [String(event.text)] });
        } else if (event.type === "error") {
          onConsole?.({ source: "run", level: "error", args: [String(event.error)] });
        }
      }
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return;
    const message = e instanceof Error ? e.message : String(e);
    onConsole?.({ source: "run", level: "error", args: [`Java main runner unavailable: ${message}`] });
  }
}
