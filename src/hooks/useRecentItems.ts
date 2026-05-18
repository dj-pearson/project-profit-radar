import { useCallback, useEffect, useState } from 'react';

export type RecentEntityType =
  | 'project'
  | 'invoice'
  | 'document'
  | 'contact'
  | 'estimate'
  | 'page';

export interface RecentItem {
  type: RecentEntityType;
  id: string;
  name: string;
  url: string;
  /** epoch ms */
  timestamp: number;
}

const STORAGE_KEY = 'brikly-recent-items';
const MAX_ITEMS = 10;
const EVENT = 'brikly-recent-items-changed';

const read = (): RecentItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RecentItem[]) : [];
  } catch {
    return [];
  }
};

const write = (items: RecentItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    // Notify other hook instances in the same tab (storage event only
    // fires cross-tab).
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* localStorage unavailable (private mode / quota) — recents are best-effort */
  }
};

/**
 * Tracks the last {@link MAX_ITEMS} entities the user opened, in localStorage.
 * `recordItem` is safe to call from a detail page's mount effect — it dedupes
 * by url and moves an existing entry to the front.
 */
export function useRecentItems() {
  const [items, setItems] = useState<RecentItem[]>(() => read());

  useEffect(() => {
    const sync = () => setItems(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const recordItem = useCallback(
    (item: Omit<RecentItem, 'timestamp'>) => {
      if (!item.id || !item.url || !item.name) return;
      const current = read();
      const deduped = current.filter((i) => i.url !== item.url);
      const next = [{ ...item, timestamp: Date.now() }, ...deduped].slice(
        0,
        MAX_ITEMS
      );
      write(next);
      setItems(next);
    },
    []
  );

  const clearRecent = useCallback(() => {
    write([]);
    setItems([]);
  }, []);

  return { recentItems: items, recordItem, clearRecent };
}
