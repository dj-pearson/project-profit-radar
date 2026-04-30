import { expect, afterEach, beforeEach, vi } from 'vitest';
import { webcrypto as nodeWebcrypto } from 'node:crypto';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { toHaveNoA11yViolations } from './accessibility-utils';

// Capacitor plugins throw "not implemented on web" when their JS APIs are
// invoked outside a native runtime. Stub them globally so any code path
// that lazily imports them (e.g. supabaseStorage's profile resume,
// useOfflineSync, useSupabaseSessionResume) doesn't hang waiting on a
// rejected promise. Preferences keeps an in-memory store so hooks that
// write-then-read see consistent values within a single test.
vi.mock('@capacitor/preferences', () => {
  const store = new Map<string, string>();
  return {
    Preferences: {
      get: vi.fn(async ({ key }: { key: string }) => ({
        value: store.has(key) ? store.get(key)! : null,
      })),
      set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
        store.set(key, value);
      }),
      remove: vi.fn(async ({ key }: { key: string }) => {
        store.delete(key);
      }),
      clear: vi.fn(async () => {
        store.clear();
      }),
      keys: vi.fn(async () => ({ keys: Array.from(store.keys()) })),
    },
  };
});

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    removeAllListeners: vi.fn().mockResolvedValue(undefined),
    getInfo: vi.fn().mockResolvedValue({ name: 'test', id: 'test', build: '1', version: '1.0.0' }),
    getState: vi.fn().mockResolvedValue({ isActive: true }),
    exitApp: vi.fn().mockResolvedValue(undefined),
  },
}));

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Extend with accessibility matchers
expect.extend({ toHaveNoA11yViolations });

// Reset fixture counters between tests
beforeEach(() => {
  // Reset ID counter for fixtures
  vi.stubGlobal('__fixtureIdCounter', 0);
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock scrollTo
window.scrollTo = vi.fn();

// Use happy-dom's native localStorage / sessionStorage — they correctly
// expose stored keys via `Object.keys(storage)` (which a closure-based
// stub does not). Just clear between tests so files don't leak state.
beforeEach(() => {
  try {
    window.localStorage.clear();
    window.sessionStorage.clear();
  } catch {
    // Ignore environments without DOM storage.
  }
});

// Mock environment variables for tests
process.env.VITE_SUPABASE_URL = 'https://api.brikly.net';
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'test-key';

// Mock navigator.geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn().mockImplementation((success) => {
    success({
      coords: {
        latitude: 34.0522,
        longitude: -118.2437,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    });
  }),
  watchPosition: vi.fn().mockReturnValue(1),
  clearWatch: vi.fn(),
};

Object.defineProperty(navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

// Mock navigator.permissions
Object.defineProperty(navigator, 'permissions', {
  value: {
    query: vi.fn().mockResolvedValue({ state: 'granted' }),
  },
  writable: true,
});

// Mock fetch for API calls
global.fetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
  })
);

// Provide a crypto global that keeps real Web Crypto (subtle) so security
// code under test (HMAC, SHA-256, etc.) works, while still allowing the
// test-friendly randomUUID override.
Object.defineProperty(globalThis, 'crypto', {
  value: {
    subtle: nodeWebcrypto.subtle,
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(7),
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  },
  configurable: true,
});

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
global.URL.revokeObjectURL = vi.fn();

// Suppress console errors in tests (optional - uncomment to reduce noise)
// global.console = {
//   ...console,
//   error: vi.fn(),
//   warn: vi.fn(),
// };
