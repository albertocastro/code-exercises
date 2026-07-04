#!/usr/bin/env node

// Java runtime helper — IN-PROCESS (no Docker).
//
// Java exercises are compiled and executed locally with the JDK's `javac`/`java`
// binaries baked into the app image. There is NO sibling Docker container and NO
// host Docker socket — the previous docker-out-of-docker design (which required
// mounting /var/run/docker.sock and running the app as root) has been removed
// for security. See web-api/handlers.mjs and docs/docker.md.
//
// Commands:
//   node scripts/runtime.mjs install [all|java]   verify the JDK is available
//   node scripts/runtime.mjs up [all|java]         (alias of install; no daemon)
//   node scripts/runtime.mjs java-test <exercise_id> <level>

import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const JAVA_HOME = process.env.JAVA_HOME || "";
const JAVA_MAX_HEAP = process.env.JAVA_MAX_HEAP || "256m";

function javaBin(name) {
  return JAVA_HOME ? path.join(JAVA_HOME, "bin", name) : name;
}

function javaHardeningFlags() {
  return [
    `-Xmx${JAVA_MAX_HEAP}`,
    "-XX:+UseSerialGC",
    "-Djava.awt.headless=true",
    "-Duser.language=en",
    "-Duser.country=US",
    "-Duser.timezone=UTC",
  ];
}

// Verify the JDK toolchain is present and usable. This replaces the old
// "build/create/start the sibling Docker container" logic.
function assertJdk() {
  const javac = spawnSync(javaBin("javac"), ["-version"], { encoding: "utf8" });
  if (javac.error || javac.status !== 0) {
    throw new Error(
      "JDK not found: `javac` is not available. Ensure a JDK is installed and JAVA_HOME is set " +
        "(the app image bakes one in; locally, install a JDK 21)."
    );
  }
  const java = spawnSync(javaBin("java"), ["-version"], { encoding: "utf8" });
  if (java.error || java.status !== 0) {
    throw new Error("JDK not found: `java` is not available on PATH / JAVA_HOME.");
  }
}

function ensureRuntime(name) {
  if (name !== "java" && name !== "all") {
    throw new Error(`Unknown runtime "${name}". Known runtimes: java, all`);
  }
  assertJdk();
  const version = spawnSync(javaBin("java"), ["-version"], { encoding: "utf8" });
  const line = (version.stderr || version.stdout || "").split("\n")[0].trim();
  console.log(`Java runtime ready (in-process): ${line}`);
}

// Compile and run a Java exercise's test class locally, in the exercise dir.
function runJavaExercise(exerciseId, level) {
  const exerciseDir = path.join(root, exerciseId);
  const testFile = readdirSync(exerciseDir).find((file) => file.endsWith("Test.java"));
  if (!testFile) {
    throw new Error(`${exerciseId} does not have a Java solution file.`);
  }
  const testClass = testFile.replace(/\.java$/, "");
  assertJdk();

  const javaFiles = readdirSync(exerciseDir).filter((f) => f.endsWith(".java"));
  const compile = spawnSync(javaBin("javac"), ["-encoding", "UTF-8", ...javaFiles], {
    cwd: exerciseDir,
    stdio: "inherit",
  });
  if (compile.status !== 0) process.exit(compile.status ?? 1);

  const run = spawnSync(
    javaBin("java"),
    [...javaHardeningFlags(), testClass, String(Number(level) || 1)],
    { cwd: exerciseDir, stdio: "inherit" }
  );
  if (run.status !== 0) process.exit(run.status ?? 1);
}

function usage() {
  console.log(`Usage:
  node scripts/runtime.mjs install [all|java]   verify the JDK is available
  node scripts/runtime.mjs up [all|java]         (alias of install; no daemon)
  node scripts/runtime.mjs java-test <exercise_id> <level>
`);
}

try {
  const [command, target = "all", level] = process.argv.slice(2);
  // The `postinstall` hook runs this with `install`. That must NOT hard-fail a
  // plain `npm install` when there's no JDK yet (e.g. inside an image build, or
  // a dev machine without a JDK) — Java exercises simply stay unavailable until
  // a JDK is present. Honor SKIP_RUNTIME_INSTALL to skip entirely (the
  // Dockerfile uses `npm ci --ignore-scripts` anyway).
  if ((command === "install" || command === "up") && process.env.SKIP_RUNTIME_INSTALL) {
    console.log("SKIP_RUNTIME_INSTALL set — skipping Java runtime check.");
    process.exit(0);
  }
  if (command === "install" || command === "up") {
    ensureRuntime(target);
  } else if (command === "java-test") {
    runJavaExercise(target, level);
  } else {
    usage();
    process.exit(command ? 1 : 0);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  // Don't let a missing JDK during `npm install` (postinstall) break the whole
  // install. Java exercises stay unavailable until a JDK is present; any other
  // invocation still fails loudly.
  if (process.env.npm_lifecycle_event === "postinstall") {
    console.warn(`Skipping Java runtime check during install: ${message}`);
    process.exit(0);
  }
  console.error(message);
  process.exit(1);
}
