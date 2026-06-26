import { useEffect, useRef, useState } from 'react';
import { loadJSON, saveJSON } from './storage';

/**
 * Like useState, but hydrated once from the platform store and then persisted
 * (debounced) on every change. Returns the value, a setter, and a `hydrated`
 * flag so the UI can avoid flashing defaults before the stored value loads.
 */
export function usePersistedState<T>(
  key: string,
  initial: T,
  debounceMs = 300,
): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate once on mount.
  useEffect(() => {
    let cancelled = false;
    loadJSON<T>(key, initial).then((loaded) => {
      if (!cancelled) {
        setValue(loaded);
        setHydrated(true);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Persist (debounced) after hydration so we never overwrite the store with defaults.
  useEffect(() => {
    if (!hydrated) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void saveJSON(key, value);
    }, debounceMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [key, value, hydrated, debounceMs]);

  return [value, setValue, hydrated];
}

/** Debounce any rapidly-changing value (used to throttle live recalculation). */
export function useDebounced<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
