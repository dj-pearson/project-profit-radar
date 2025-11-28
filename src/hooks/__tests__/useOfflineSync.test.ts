import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOfflineSync, OfflineData } from '../useOfflineSync';

// Mock Capacitor modules
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue({ files: [] }),
    readFile: vi.fn().mockResolvedValue({ data: '{}' }),
    writeFile: vi.fn().mockResolvedValue(undefined),
    deleteFile: vi.fn().mockResolvedValue(undefined),
  },
  Directory: {
    Data: 'DATA',
  },
  Encoding: {
    UTF8: 'utf8',
  },
}));

vi.mock('@capacitor/device', () => ({
  Device: {
    getInfo: vi.fn().mockResolvedValue({ platform: 'web' }),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

vi.mock('../use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('useOfflineSync', () => {
  let originalNavigator: boolean;

  beforeEach(() => {
    originalNavigator = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  describe('initial state', () => {
    it('should initialize with online status based on navigator', () => {
      const { result } = renderHook(() => useOfflineSync());

      expect(result.current.isOnline).toBe(true);
    });

    it('should initialize with empty pending sync array', () => {
      const { result } = renderHook(() => useOfflineSync());

      expect(result.current.pendingSync).toEqual([]);
    });

    it('should initialize with syncInProgress as false', () => {
      const { result } = renderHook(() => useOfflineSync());

      expect(result.current.syncInProgress).toBe(false);
    });
  });

  describe('saveOfflineData', () => {
    it('should return an id when saving data', async () => {
      const { result } = renderHook(() => useOfflineSync());

      let id: string | undefined;
      await act(async () => {
        id = await result.current.saveOfflineData('time_entry', { hours: 8 });
      });

      expect(id).toBeDefined();
      expect(id).toMatch(/^offline_/);
    });

    it('should add item to pending sync', async () => {
      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await result.current.saveOfflineData('time_entry', { hours: 8 });
      });

      expect(result.current.pendingSync.length).toBe(1);
      expect(result.current.pendingSync[0].type).toBe('time_entry');
    });

    it('should set synced to false for new items', async () => {
      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await result.current.saveOfflineData('daily_report', { notes: 'Test' });
      });

      expect(result.current.pendingSync[0].synced).toBe(false);
    });

    it('should set retryCount to 0 for new items', async () => {
      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await result.current.saveOfflineData('expense', { amount: 100 });
      });

      expect(result.current.pendingSync[0].retryCount).toBe(0);
    });

    it('should include timestamp in saved item', async () => {
      const { result } = renderHook(() => useOfflineSync());

      const beforeSave = new Date().toISOString();
      await act(async () => {
        await result.current.saveOfflineData('time_entry', { hours: 8 });
      });
      const afterSave = new Date().toISOString();

      const timestamp = result.current.pendingSync[0].timestamp;
      expect(timestamp >= beforeSave).toBe(true);
      expect(timestamp <= afterSave).toBe(true);
    });
  });

  describe('getStorageInfo', () => {
    it('should return storage information', async () => {
      const { result } = renderHook(() => useOfflineSync());

      let info: any;
      await act(async () => {
        info = await result.current.getStorageInfo();
      });

      expect(info).toBeDefined();
      expect(info.platform).toBe('web');
      expect(info.pendingItems).toBe(0);
    });

    it('should include failed items count', async () => {
      const { result } = renderHook(() => useOfflineSync());

      let info: any;
      await act(async () => {
        info = await result.current.getStorageInfo();
      });

      expect(info.failedItems).toBe(0);
    });
  });

  describe('online/offline events', () => {
    it('should update isOnline when going offline', async () => {
      const { result } = renderHook(() => useOfflineSync());

      expect(result.current.isOnline).toBe(true);

      await act(async () => {
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });
    });

    it('should update isOnline when coming online', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });
    });
  });

  describe('return value structure', () => {
    it('should return all expected properties and functions', () => {
      const { result } = renderHook(() => useOfflineSync());

      // State properties
      expect(result.current).toHaveProperty('isOnline');
      expect(result.current).toHaveProperty('pendingSync');
      expect(result.current).toHaveProperty('syncInProgress');
      expect(result.current).toHaveProperty('lastSyncTime');

      // Action functions
      expect(typeof result.current.saveOfflineData).toBe('function');
      expect(typeof result.current.syncPendingData).toBe('function');
      expect(typeof result.current.clearSyncedData).toBe('function');
      expect(typeof result.current.retryFailedSync).toBe('function');
      expect(typeof result.current.getStorageInfo).toBe('function');
    });
  });

  describe('OfflineData type', () => {
    it('should support all offline data types', async () => {
      const { result } = renderHook(() => useOfflineSync());

      const types: OfflineData['type'][] = [
        'time_entry',
        'daily_report',
        'expense',
        'photo',
        'voice_note',
        'safety_incident',
      ];

      for (const type of types) {
        await act(async () => {
          await result.current.saveOfflineData(type, { test: true });
        });
      }

      expect(result.current.pendingSync.length).toBe(types.length);
    });
  });
});

describe('OfflineData interface', () => {
  it('should have correct structure', () => {
    const offlineData: OfflineData = {
      id: 'test-id',
      type: 'time_entry',
      data: { hours: 8 },
      timestamp: new Date().toISOString(),
      synced: false,
      retryCount: 0,
    };

    expect(offlineData.id).toBe('test-id');
    expect(offlineData.type).toBe('time_entry');
    expect(offlineData.synced).toBe(false);
    expect(offlineData.retryCount).toBe(0);
  });

  it('should support optional properties', () => {
    const offlineData: OfflineData = {
      id: 'test-id',
      type: 'expense',
      data: { amount: 100 },
      timestamp: new Date().toISOString(),
      synced: false,
      retryCount: 2,
      lastAttempt: new Date().toISOString(),
      error: 'Network error',
    };

    expect(offlineData.lastAttempt).toBeDefined();
    expect(offlineData.error).toBe('Network error');
  });
});
