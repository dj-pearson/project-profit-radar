import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'light' | 'dark' | 'system';

interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

interface MobileThemeContextType {
  theme: Theme;
  activeColorScheme: ColorSchemeName;
  colors: ThemeColors;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const lightColors: ThemeColors = {
  primary: '#4A90E2',
  secondary: '#357ABD',
  background: '#FFFFFF',
  surface: '#F8FAFC',
  text: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#06B6D4',
};

const darkColors: ThemeColors = {
  primary: '#60A5FA',
  secondary: '#3B82F6',
  background: '#111827',
  surface: '#1F2937',
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  border: '#374151',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#22D3EE',
};

const MobileThemeContext = createContext<MobileThemeContextType | undefined>(undefined);

export const useMobileTheme = () => {
  const context = useContext(MobileThemeContext);
  if (!context) {
    throw new Error('useMobileTheme must be used within a MobileThemeProvider');
  }
  return context;
};

interface MobileThemeProviderProps {
  children: React.ReactNode;
}

export const MobileThemeProvider: React.FC<MobileThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('system');
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  // Load saved theme from AsyncStorage
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme');
        if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
          setThemeState(savedTheme as Theme);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      }
    };
    loadTheme();
  }, []);

  // Listen to system color scheme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });

    return () => subscription?.remove();
  }, []);

  const setTheme = async (newTheme: Theme) => {
    try {
      await AsyncStorage.setItem('theme', newTheme);
      setThemeState(newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const getActiveColorScheme = (): ColorSchemeName => {
    if (theme === 'system') {
      return systemColorScheme;
    }
    return theme as ColorSchemeName;
  };

  const activeColorScheme = getActiveColorScheme();
  const isDark = activeColorScheme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const value: MobileThemeContextType = {
    theme,
    activeColorScheme,
    colors,
    setTheme,
    isDark,
  };

  return (
    <MobileThemeContext.Provider value={value}>
      {children}
    </MobileThemeContext.Provider>
  );
};
