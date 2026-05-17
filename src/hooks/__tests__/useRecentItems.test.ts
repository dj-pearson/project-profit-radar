import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecentItems } from '../useRecentItems';

describe('useRecentItems', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts empty when nothing is stored', () => {
    const { result } = renderHook(() => useRecentItems());
    expect(result.current.recentItems).toEqual([]);
  });

  it('records an item and exposes it', () => {
    const { result } = renderHook(() => useRecentItems());
    act(() => {
      result.current.recordItem({
        type: 'project',
        id: 'p1',
        name: 'Riverside',
        url: '/projects/p1',
      });
    });
    expect(result.current.recentItems).toHaveLength(1);
    expect(result.current.recentItems[0].name).toBe('Riverside');
    expect(result.current.recentItems[0].timestamp).toBeTypeOf('number');
  });

  it('dedupes by url and moves the entry to the front', () => {
    const { result } = renderHook(() => useRecentItems());
    act(() => {
      result.current.recordItem({ type: 'project', id: 'p1', name: 'A', url: '/projects/p1' });
      result.current.recordItem({ type: 'invoice', id: 'i2', name: 'B', url: '/invoices/i2' });
      result.current.recordItem({ type: 'project', id: 'p1', name: 'A2', url: '/projects/p1' });
    });
    expect(result.current.recentItems).toHaveLength(2);
    expect(result.current.recentItems[0].url).toBe('/projects/p1');
    expect(result.current.recentItems[0].name).toBe('A2');
  });

  it('caps the list at 10 items, keeping the most recent', () => {
    const { result } = renderHook(() => useRecentItems());
    act(() => {
      for (let i = 0; i < 14; i++) {
        result.current.recordItem({
          type: 'page',
          id: String(i),
          name: `Item ${i}`,
          url: `/x/${i}`,
        });
      }
    });
    expect(result.current.recentItems).toHaveLength(10);
    expect(result.current.recentItems[0].url).toBe('/x/13');
    expect(result.current.recentItems.some((r) => r.url === '/x/3')).toBe(false);
  });

  it('clears the list', () => {
    const { result } = renderHook(() => useRecentItems());
    act(() => {
      result.current.recordItem({ type: 'project', id: 'p1', name: 'A', url: '/projects/p1' });
      result.current.clearRecent();
    });
    expect(result.current.recentItems).toEqual([]);
  });

  it('ignores items missing id/url/name', () => {
    const { result } = renderHook(() => useRecentItems());
    act(() => {
      result.current.recordItem({ type: 'project', id: '', name: 'X', url: '/x' });
    });
    expect(result.current.recentItems).toEqual([]);
  });
});
