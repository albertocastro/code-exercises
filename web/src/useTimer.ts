import { useCallback, useEffect, useRef, useState } from "react";

// How long the user can go without any input before we treat them as "away"
// and stop accruing time. Reading a long README shouldn't burn the clock, but
// we don't want to freeze the instant they stop typing either.
const IDLE_MS = 60_000;
// Cap how much we credit between ticks. Protects against a laptop that was
// asleep / a background tab that fired one throttled tick after a long gap —
// without this, a wake-up could dump minutes of "work" in a single delta.
const MAX_TICK_MS = 2_000;
const TICK_MS = 500;
const PERSIST_EVERY_MS = 1_000;
const STORE_PREFIX = "code-exercises-timer:";

function load(key: string | undefined): number {
  if (!key) return 0;
  const raw = localStorage.getItem(STORE_PREFIX + key);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function save(key: string | undefined, ms: number) {
  if (!key) return;
  localStorage.setItem(STORE_PREFIX + key, String(Math.round(ms)));
}

/**
 * A stopwatch that only counts *active* work time.
 *
 * It stops accruing when the tab is hidden, when the window is in the
 * background, or when the user has been idle (no input) past IDLE_MS — and it
 * persists elapsed time per `persistKey`, so leaving and coming back resumes
 * where you left off instead of either resetting to zero or silently counting
 * all the time you were away.
 *
 * `running` is the user's intent (the play/pause button). `active` is whether
 * the clock is *actually* ticking right now (running AND visible AND not idle).
 */
export function useTimer(persistKey?: string) {
  const [elapsed, setElapsedState] = useState(() => load(persistKey));
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState(false);

  const accruedRef = useRef(elapsed);
  const runningRef = useRef(running);
  const lastTickRef = useRef(Date.now());
  const lastActivityRef = useRef(Date.now());
  const lastSaveRef = useRef(0);
  const keyRef = useRef(persistKey);

  const setElapsed = useCallback(
    (ms: number) => {
      accruedRef.current = ms;
      setElapsedState(ms);
      save(keyRef.current, ms);
    },
    []
  );

  // When the exercise/level changes, flush the old key and restore the new one
  // so each level keeps its own active-time total across reloads and revisits.
  useEffect(() => {
    if (keyRef.current !== persistKey) {
      save(keyRef.current, accruedRef.current);
      keyRef.current = persistKey;
      const restored = load(persistKey);
      accruedRef.current = restored;
      setElapsedState(restored);
    }
    lastTickRef.current = Date.now();
    lastActivityRef.current = Date.now();
  }, [persistKey]);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  // Track user input so we can detect "away from keyboard". Passive listeners
  // on the window; any of these counts as being at the desk working.
  useEffect(() => {
    const seen = () => (lastActivityRef.current = Date.now());
    const events = ["pointerdown", "pointermove", "keydown", "wheel", "scroll", "touchstart"];
    for (const e of events) window.addEventListener(e, seen, { passive: true });
    return () => {
      for (const e of events) window.removeEventListener(e, seen);
    };
  }, []);

  // Don't credit time while the tab is hidden; reset the tick clock on return
  // so the hidden span isn't billed as one huge delta on the next tick.
  useEffect(() => {
    const onVisibility = () => {
      lastTickRef.current = Date.now();
      if (document.visibilityState === "visible") lastActivityRef.current = Date.now();
      else save(keyRef.current, accruedRef.current); // flush before we may be frozen
    };
    const onLeave = () => save(keyRef.current, accruedRef.current);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onLeave);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onLeave);
    };
  }, []);

  // The single accrual loop. Runs whenever the user intends the timer to run;
  // each tick decides whether *this moment* is active and credits accordingly.
  useEffect(() => {
    if (!running) {
      setActive(false);
      save(keyRef.current, accruedRef.current);
      return;
    }
    lastTickRef.current = Date.now();
    lastActivityRef.current = Date.now();

    const id = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      const visible =
        typeof document === "undefined" ||
        document.visibilityState === "visible";
      const idle = now - lastActivityRef.current > IDLE_MS;
      const isActive = visible && !idle;
      setActive(isActive);

      if (isActive && delta > 0) {
        accruedRef.current += Math.min(delta, MAX_TICK_MS);
        setElapsedState(accruedRef.current);
        if (now - lastSaveRef.current >= PERSIST_EVERY_MS) {
          lastSaveRef.current = now;
          save(keyRef.current, accruedRef.current);
        }
      }
    }, TICK_MS);

    return () => {
      clearInterval(id);
      save(keyRef.current, accruedRef.current);
    };
  }, [running]);

  const start = useCallback(() => {
    lastTickRef.current = Date.now();
    lastActivityRef.current = Date.now();
    setRunning(true);
  }, []);

  const stop = useCallback(() => {
    setRunning(false);
    setActive(false);
  }, []);

  const reset = useCallback(() => {
    accruedRef.current = 0;
    lastTickRef.current = Date.now();
    lastActivityRef.current = Date.now();
    setElapsedState(0);
    save(keyRef.current, 0);
  }, []);

  return { elapsed, running, active, setElapsed, start, stop, reset };
}

export function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
