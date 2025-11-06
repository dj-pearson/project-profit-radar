/**
 * Safe storage adapter for Supabase Auth
 * Wraps localStorage with error handling for better reliability
 */

import { safeStorage } from './safeStorage';
import type { SupportedStorage } from '@supabase/supabase-js';

/**
 * Create a storage adapter that Supabase can use
 * This implements the SupportedStorage interface with safe error handling
 */
export const createSupabaseStorage = (): SupportedStorage => {
  return {
    getItem: (key: string) => {
      return safeStorage.getItem(key);
    },

    setItem: (key: string, value: string) => {
      safeStorage.setItem(key, value);
    },

    removeItem: (key: string) => {
      safeStorage.removeItem(key);
    },
  };
};

export const supabaseStorage = createSupabaseStorage();
