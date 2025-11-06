/**
 * Safe localStorage wrapper that handles errors gracefully
 * Prevents crashes in private browsing mode or when storage is full
 */

type StorageValue = string | null;

/**
 * Safely set an item in localStorage
 * @param key - The key to store the value under
 * @param value - The value to store
 * @returns true if successful, false otherwise
 */
export const setItem = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`Failed to set localStorage item "${key}":`, error);
    }
    return false;
  }
};

/**
 * Safely get an item from localStorage
 * @param key - The key to retrieve
 * @returns The stored value or null if not found or error occurred
 */
export const getItem = (key: string): StorageValue => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`Failed to get localStorage item "${key}":`, error);
    }
    return null;
  }
};

/**
 * Safely remove an item from localStorage
 * @param key - The key to remove
 * @returns true if successful, false otherwise
 */
export const removeItem = (key: string): boolean => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`Failed to remove localStorage item "${key}":`, error);
    }
    return false;
  }
};

/**
 * Safely clear all items from localStorage
 * @returns true if successful, false otherwise
 */
export const clear = (): boolean => {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to clear localStorage:', error);
    }
    return false;
  }
};

/**
 * Safely get a JSON value from localStorage
 * @param key - The key to retrieve
 * @param defaultValue - Default value to return if parsing fails
 * @returns The parsed JSON value or default value
 */
export const getJSON = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`Failed to get/parse JSON from localStorage "${key}":`, error);
    }
    return defaultValue;
  }
};

/**
 * Safely set a JSON value in localStorage
 * @param key - The key to store the value under
 * @param value - The value to store (will be JSON stringified)
 * @returns true if successful, false otherwise
 */
export const setJSON = <T>(key: string, value: T): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`Failed to set JSON in localStorage "${key}":`, error);
    }
    return false;
  }
};

/**
 * Check if localStorage is available
 * @returns true if localStorage is available and working
 */
export const isAvailable = (): boolean => {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get the number of items in localStorage
 * @returns The number of items or 0 if error occurred
 */
export const length = (): number => {
  try {
    return localStorage.length;
  } catch {
    return 0;
  }
};

/**
 * Get a key by index
 * @param index - The index of the key to retrieve
 * @returns The key or null if not found or error occurred
 */
export const key = (index: number): string | null => {
  try {
    return localStorage.key(index);
  } catch {
    return null;
  }
};

// Export as a namespace for easier imports
export const safeStorage = {
  setItem,
  getItem,
  removeItem,
  clear,
  getJSON,
  setJSON,
  isAvailable,
  length,
  key,
};

export default safeStorage;
