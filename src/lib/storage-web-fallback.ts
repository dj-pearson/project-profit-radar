// Web fallback for AsyncStorage
export default {
  getItem: async (key: string): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  },
  clear: async (): Promise<void> => {
    if (typeof window === 'undefined') return;
    localStorage.clear();
  },
};
