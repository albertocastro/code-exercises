import { useEffect, useRef, useState } from "react";

export function useTimer() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const baseRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    baseRef.current = Date.now() - elapsed;
    const id = setInterval(() => setElapsed(Date.now() - baseRef.current), 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  return {
    elapsed,
    running,
    setElapsed,
    start: () => setRunning(true),
    stop: () => setRunning(false),
  };
}

export function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
