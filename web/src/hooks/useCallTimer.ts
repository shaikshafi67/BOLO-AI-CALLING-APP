import { useEffect, useState } from 'react';

/** Counts seconds while `running` is true. */
export function useCallTimer(running: boolean, startAt = 0): number {
  const [seconds, setSeconds] = useState(startAt);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  return seconds;
}
