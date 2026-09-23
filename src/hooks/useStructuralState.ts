import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

/**
 * True when two JSON-shaped values hold the same data. Used to keep an old
 * object identity when a refetch or token refresh hands back an equal copy
 * (US-219). Only meant for plain data (API rows, the Supabase User).
 */
export function isSameData(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/**
 * useState whose setter ignores a value equal in data to the current one, so
 * context values and effects keyed on it see a stable identity (US-219).
 * The setter is stable, like React's.
 */
export function useStructuralState<T>(initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initial);
  const setStructural = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    setValue((prev) => {
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      return isSameData(prev, resolved) ? prev : resolved;
    });
  }, []);
  return [value, setStructural];
}
