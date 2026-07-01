#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const RUNTIMES = {
  java: {
    image: "code-exercises-java:latest",
    container: "code-exercises-java-runtime",
    dockerfileDir: path.join(root, "runtimes", "java"),
  },
};

function docker(args, options = {}) {
  return spawnSync("docker", args, {
    cwd: root,
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
}

function assertDocker() {
  const version = docker(["--version"], { capture: true });
  if (version.status !== 0) {
    throw new Error("Docker is not installed or is not on PATH.");
  }

  const info = docker(["info", "--format", "{{.ServerVersion}}"], { capture: true });
  if (info.status !== 0) {
    throw new Error(
      "Docker is installed, but the daemon is not running. Start Docker Desktop and rerun this command."
    );
  }
}

function runtimeFor(name) {
  const runtime = RUNTIMES[name];
  if (!runtime) {
    throw new Error(`Unknown runtime "${name}". Known runtimes: ${Object.keys(RUNTIMES).join(", ")}`);
  }
  return runtime;
}

function imageExists(runtime) {
  const result = docker(["image", "inspect", runtime.image], { capture: true });
  return result.status === 0;
}

function containerExists(runtime) {
  const result = docker(["container", "inspect", runtime.container], { capture: true });
  return result.status === 0;
}

function containerRunning(runtime) {
  const result = docker(
    ["container", "inspect", "-f", "{{.State.Running}}", runtime.container],
    { capture: true }
  );
  return result.status === 0 && result.stdout.trim() === "true";
}

function ensureRuntime(name) {
  const runtime = runtimeFor(name);
  assertDocker();

  if (!imageExists(runtime)) {
    console.log(`Building ${name} runtime image (${runtime.image})...`);
    const build = docker(["build", "-t", runtime.image, runtime.dockerfileDir]);
    if (build.status !== 0) throw new Error(`Could not build ${name} runtime image.`);
  }

  if (!containerExists(runtime)) {
    console.log(`Creating ${name} runtime container (${runtime.container})...`);
    const create = docker([
      "create",
      "--name",
      runtime.container,
      "--label",
      "code-exercises-runtime=true",
      runtime.image,
    ]);
    if (create.status !== 0) throw new Error(`Could not create ${name} runtime container.`);
  }

  if (!containerRunning(runtime)) {
    console.log(`Starting ${name} runtime container (${runtime.container})...`);
    const start = docker(["start", runtime.container]);
    if (start.status !== 0) throw new Error(`Could not start ${name} runtime container.`);
  }
}

function ensureAll() {
  for (const name of Object.keys(RUNTIMES)) ensureRuntime(name);
}

function runJavaExercise(exerciseId, level) {
  const exerciseDir = path.join(root, exerciseId);
  const testFile = readdirSync(exerciseDir).find((file) => file.endsWith("Test.java"));
  if (!testFile) {
    throw new Error(`${exerciseId} does not have a Java solution file.`);
  }
  const testClass = testFile.replace(/\.java$/, "");
  ensureRuntime("java");

  const runtime = runtimeFor("java");
  const runId = `exercise-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const containerDir = `/tmp/${runId}`;
  const mkdir = docker(["exec", runtime.container, "mkdir", "-p", containerDir]);
  if (mkdir.status !== 0) throw new Error("Could not prepare Java runtime directory.");

  const copy = docker(["cp", `${exerciseDir}/.`, `${runtime.container}:${containerDir}`]);
  if (copy.status !== 0) throw new Error("Could not copy Java exercise files into runtime container.");

  try {
    const run = docker([
      "exec",
      "-w",
      containerDir,
      runtime.container,
      "bash",
      "-lc",
      `javac *.java && java ${testClass} ${Number(level) || 1}`,
    ]);
    if (run.status !== 0) process.exit(run.status ?? 1);
  } finally {
    docker(["exec", runtime.container, "rm", "-rf", containerDir], { capture: true });
  }
}

function usage() {
  console.log(`Usage:
  node scripts/runtime.mjs install [all|java]
  node scripts/runtime.mjs up [all|java]
  node scripts/runtime.mjs java-test <exercise_id> <level>
`);
}

try {
  const [command, target = "all", level] = process.argv.slice(2);
  if (command === "install" || command === "up") {
    if (target === "all") ensureAll();
    else ensureRuntime(target);
  } else if (command === "java-test") {
    runJavaExercise(target, level);
  } else {
    usage();
    process.exit(command ? 1 : 0);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
