// Local, persistent progress + metrics. Everything lives in localStorage so it
// survives reloads with no backend.
const KEY = "code-exercises-progress-v1";

export interface LevelStat {
  attempts: number; // number of test runs
  timeMs: number; // time spent (recorded on submit)
  passedAt?: number; // first time tests went green
  submittedAt?: number; // when the learner submitted (gates the next level)
}
export interface ExerciseProgress {
  unlockedLevel: number;
  levels: Record<number, LevelStat>;
}
type Store = Record<string, ExerciseProgress>;

function load(): Store {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}
function save(store: Store) {
  localStorage.setItem(KEY, JSON.stringify(store));
}
function blank(): ExerciseProgress {
  return { unlockedLevel: 1, levels: {} };
}
function ensure(ex: ExerciseProgress, level: number): LevelStat {
  return (ex.levels[level] ??= { attempts: 0, timeMs: 0 });
}

export function getExercise(key: string): ExerciseProgress {
  return load()[key] ?? blank();
}

export function recordAttempt(key: string, level: number): ExerciseProgress {
  const store = load();
  const ex = (store[key] ??= blank());
  ensure(ex, level).attempts += 1;
  save(store);
  return ex;
}

export function markPassed(key: string, level: number): ExerciseProgress {
  const store = load();
  const ex = (store[key] ??= blank());
  const stat = ensure(ex, level);
  stat.passedAt ??= Date.now();
  save(store);
  return ex;
}

export function submitLevel(
  key: string,
  level: number,
  timeMs: number,
  totalLevels: number
): ExerciseProgress {
  const store = load();
  const ex = (store[key] ??= blank());
  const stat = ensure(ex, level);
  stat.submittedAt = Date.now();
  stat.timeMs = timeMs;
  ex.unlockedLevel = Math.max(ex.unlockedLevel, Math.min(level + 1, totalLevels + 1));
  save(store);
  return ex;
}

export function allProgress(): Store {
  return load();
}

export function resetAll() {
  localStorage.removeItem(KEY);
}
