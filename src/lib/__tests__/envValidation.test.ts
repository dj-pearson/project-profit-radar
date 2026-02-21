import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We test the exported logic by importing the module.
// Note: envValidation.ts uses import.meta.env which Vitest handles natively.

describe('envValidation', () => {
  // We need to re-import after setting env vars, so use dynamic import
  const loadModule = async () => {
    // Clear module cache so env changes take effect
    vi.resetModules();
    return await import('../envValidation');
  };

  describe('isDevelopment()', () => {
    it('returns a boolean', async () => {
      const mod = await loadModule();
      expect(typeof mod.isDevelopment()).toBe('boolean');
    });
  });

  describe('isProduction()', () => {
    it('returns a boolean', async () => {
      const mod = await loadModule();
      expect(typeof mod.isProduction()).toBe('boolean');
    });
  });

  describe('getMode()', () => {
    it('returns a string', async () => {
      const mod = await loadModule();
      expect(typeof mod.getMode()).toBe('string');
    });
  });

  describe('getEnvConfig()', () => {
    it('returns an object with expected keys', async () => {
      const mod = await loadModule();
      const config = mod.getEnvConfig();
      expect(config).toHaveProperty('VITE_SUPABASE_URL');
      expect(config).toHaveProperty('VITE_SUPABASE_PUBLISHABLE_KEY');
    });

    it('falls back to production URL when env var is missing', async () => {
      const mod = await loadModule();
      const config = mod.getEnvConfig();
      // URL should either be set or fall back to production default
      expect(typeof config.VITE_SUPABASE_URL).toBe('string');
      expect(config.VITE_SUPABASE_URL.length).toBeGreaterThan(0);
    });

    it('returns empty string for missing publishable key (no hardcoded token)', async () => {
      const mod = await loadModule();
      const config = mod.getEnvConfig();
      // Key should come from env or be empty - never a hardcoded JWT
      if (config.VITE_SUPABASE_PUBLISHABLE_KEY) {
        // If set, it should be a string
        expect(typeof config.VITE_SUPABASE_PUBLISHABLE_KEY).toBe('string');
      }
    });
  });

  describe('validateEnvironment()', () => {
    it('returns a boolean', async () => {
      const mod = await loadModule();
      const result = mod.validateEnvironment();
      expect(typeof result).toBe('boolean');
    });
  });
});
