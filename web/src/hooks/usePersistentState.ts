import { useCallback, useState } from 'react';

/** useState for a settings object, mirrored into localStorage. New keys fall back to `initial`. */
export function usePersistentState<T extends object>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? { ...initial, ...(JSON.parse(raw) as T) } : initial;
    } catch {
      return initial;
    }
  });

  const set = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* storage blocked */
      }
    },
    [key],
  );

  return [value, set];
}
