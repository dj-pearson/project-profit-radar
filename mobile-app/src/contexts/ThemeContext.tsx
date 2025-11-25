import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  info: string;
}

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const lightColors: ThemeColors = {
  primary: '#4A90E2',
  secondary: '#66BB6A',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#333333',
  textSecondary: '#666666',
  border: '#E0E0E0',
  error: '#EF5350',
  success: '#66BB6A',
  warning: '#FFA726',
  info: '#4A90E2',
};

const darkColors: ThemeColors = {
  primary: '#64B5F6',
  secondary: '#81C784',
  background: '#121212',
  surface: '#1E1E1E',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  border: '#333333',
  error: '#EF5350',
  success: '#81C784',
  warning: '#FFB74D',
  info: '#64B5F6',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'builddesk_theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('auto');
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');

  useEffect(() => {
    // Load saved theme preference
    loadThemePreference();
  }, []);

  useEffect(() => {
    // Update isDark based on mode and system preference
    if (mode === 'auto') {
      setIsDark(systemColorScheme === 'dark');
    } else {
      setIsDark(mode === 'dark');
    }
  }, [mode, systemColorScheme]);

  const loadThemePreference = async () => {
    try {
      const savedMode = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
      if (savedMode && (savedMode === 'light' || savedMode === 'dark' || savedMode === 'auto')) {
        setMode(savedMode as ThemeMode);
      }
    } catch (error) {
      console.warn('Failed to load theme preference:', error);
    }
  };

  const setThemeMode = async (newMode: ThemeMode) => {
    try {
      await SecureStore.setItemAsync(THEME_STORAGE_KEY, newMode);
      setMode(newMode);
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
      setMode(newMode); // Still update the mode even if saving fails
    }
  };

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
