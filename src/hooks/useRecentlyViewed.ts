import { useState, useEffect, useCallback } from 'react';

export interface RecentItem {
  id: string;
  type: 'project' | 'invoice' | 'document' | 'estimate' | 'contact';
  name: string;
  path: string;
  viewedAt: string; // ISO date
}

const RECENT_KEY = 'builddesk-recent-items';
const FAVORITES_KEY = 'builddesk-favorites';
const MAX_RECENT = 10;

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // Ignore parse errors
  }
  return fallback;
}

function saveToStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors (e.g., quota exceeded)
  }
}

export function useRecentlyViewed() {
  const [recentItems, setRecentItems] = useState<RecentItem[]>(() =>
    loadFromStorage<RecentItem[]>(RECENT_KEY, [])
  );
  const [favorites, setFavorites] = useState<RecentItem[]>(() =>
    loadFromStorage<RecentItem[]>(FAVORITES_KEY, [])
  );

  // Persist recent items when they change
  useEffect(() => {
    saveToStorage(RECENT_KEY, recentItems);
  }, [recentItems]);

  // Persist favorites when they change
  useEffect(() => {
    saveToStorage(FAVORITES_KEY, favorites);
  }, [favorites]);

  const addRecentItem = useCallback((item: Omit<RecentItem, 'viewedAt'>) => {
    setRecentItems((prev) => {
      // Remove existing entry with the same path (dedup)
      const filtered = prev.filter((existing) => existing.path !== item.path);
      // Add to the top with current timestamp
      const newItem: RecentItem = {
        ...item,
        viewedAt: new Date().toISOString(),
      };
      const updated = [newItem, ...filtered];
      // Limit to MAX_RECENT
      return updated.slice(0, MAX_RECENT);
    });
  }, []);

  const clearRecent = useCallback(() => {
    setRecentItems([]);
  }, []);

  const toggleFavorite = useCallback((item: RecentItem) => {
    setFavorites((prev) => {
      const exists = prev.some((fav) => fav.path === item.path);
      if (exists) {
        return prev.filter((fav) => fav.path !== item.path);
      }
      return [...prev, { ...item, viewedAt: new Date().toISOString() }];
    });
  }, []);

  const isFavorite = useCallback(
    (path: string) => favorites.some((fav) => fav.path === path),
    [favorites]
  );

  return {
    recentItems,
    addRecentItem,
    clearRecent,
    favorites,
    toggleFavorite,
    isFavorite,
  };
}
