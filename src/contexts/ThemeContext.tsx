import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface AccessibilityPreferences {
  highContrast: boolean;
  reduceMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: 'light' | 'dark';
  accessibility: AccessibilityPreferences;
  updateAccessibility: (prefs: Partial<AccessibilityPreferences>) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as Theme) || 'light';
    }
    return 'light';
  });

  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');
  
  const [accessibility, setAccessibility] = useState<AccessibilityPreferences>(() => {
    if (typeof window !== 'undefined') {
      const savedPrefs = localStorage.getItem('accessibility');
      if (savedPrefs) {
        return JSON.parse(savedPrefs);
      }
    }
    return {
      highContrast: false,
      reduceMotion: false,
      screenReader: false,
      keyboardNavigation: false,
      fontSize: 'medium'
    };
  });

  const updateAccessibility = (prefs: Partial<AccessibilityPreferences>) => {
    const updatedPrefs = { ...accessibility, ...prefs };
    setAccessibility(updatedPrefs);
    localStorage.setItem('accessibility', JSON.stringify(updatedPrefs));
  };

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Apply accessibility preferences
    root.classList.toggle('high-contrast', accessibility.highContrast);
    root.classList.toggle('reduce-motion', accessibility.reduceMotion);
    root.classList.toggle('screen-reader-support', accessibility.screenReader);
    root.classList.toggle('keyboard-navigation', accessibility.keyboardNavigation);
    
    // Apply font size
    root.classList.remove('text-size-small', 'text-size-medium', 'text-size-large');
    root.classList.add(`text-size-${accessibility.fontSize}`);
    
  }, [accessibility]);

  useEffect(() => {
    const root = window.document.documentElement;
    
    const getSystemTheme = () => {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    const applyTheme = (newTheme: Theme) => {
      let resolvedTheme: 'light' | 'dark';
      
      if (newTheme === 'system') {
        resolvedTheme = getSystemTheme();
      } else {
        resolvedTheme = newTheme;
      }

      root.classList.remove('light', 'dark');
      root.classList.add(resolvedTheme);
      setActualTheme(resolvedTheme);
    };

    applyTheme(theme);
    localStorage.setItem('theme', theme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, actualTheme, accessibility, updateAccessibility }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};