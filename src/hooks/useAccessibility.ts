import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export type ContrastMode = 'normal' | 'high' | 'outdoor';
export type FontSize = 'normal' | 'large' | 'extra-large';
export type MotionPreference = 'normal' | 'reduced';

interface AccessibilitySettings {
  contrastMode: ContrastMode;
  fontSize: FontSize;
  motionPreference: MotionPreference;
  screenReaderOptimized: boolean;
  keyboardNavigation: boolean;
  focusIndicators: boolean;
}

const defaultSettings: AccessibilitySettings = {
  contrastMode: 'normal',
  fontSize: 'normal',
  motionPreference: 'normal',
  screenReaderOptimized: false,
  keyboardNavigation: true,
  focusIndicators: true,
};

export const useAccessibility = () => {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('accessibility-settings');
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        setSettings({ ...defaultSettings, ...parsedSettings });
      }
      
      // Detect system preferences
      detectSystemPreferences();
    } catch (error) {
      console.error('Failed to load accessibility settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Detect system accessibility preferences
  const detectSystemPreferences = useCallback(() => {
    // Detect high contrast preference
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      updateSetting('contrastMode', 'high');
    }

    // Detect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      updateSetting('motionPreference', 'reduced');
    }

    // Detect screen reader usage
    if (window.navigator.userAgent.includes('NVDA') || 
        window.navigator.userAgent.includes('JAWS') || 
        window.speechSynthesis) {
      updateSetting('screenReaderOptimized', true);
    }
  }, []);

  // Apply settings to document
  useEffect(() => {
    applySettings();
  }, [settings]);

  const applySettings = useCallback(() => {
    const root = document.documentElement;
    
    // Apply contrast mode
    root.classList.remove('contrast-normal', 'contrast-high', 'contrast-outdoor');
    root.classList.add(`contrast-${settings.contrastMode}`);
    
    // Apply font size
    root.classList.remove('font-normal', 'font-large', 'font-extra-large');
    root.classList.add(`font-${settings.fontSize}`);

    // Apply motion preference
    root.classList.toggle('reduce-motion', settings.motionPreference === 'reduced');

    // Apply screen reader optimizations
    root.classList.toggle('screen-reader-optimized', settings.screenReaderOptimized);

    // Apply focus indicators
    root.classList.toggle('enhanced-focus', settings.focusIndicators);

    // Set CSS custom properties
    root.style.setProperty('--accessibility-contrast', settings.contrastMode);
    root.style.setProperty('--accessibility-font-size', settings.fontSize);
    root.style.setProperty('--accessibility-motion', settings.motionPreference);
  }, [settings]);

  const updateSetting = useCallback(<K extends keyof AccessibilitySettings>(
    key: K, 
    value: AccessibilitySettings[K]
  ) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      
      // Save to localStorage
      try {
        localStorage.setItem('accessibility-settings', JSON.stringify(newSettings));
      } catch (error) {
        console.error('Failed to save accessibility settings:', error);
      }
      
      return newSettings;
    });

    // Accessibility settings updated silently
  }, [toast]);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    localStorage.removeItem('accessibility-settings');
    
    toast({
      title: "Settings Reset",
      description: "Accessibility settings have been reset to default",
    });
  }, [toast]);

  // Keyboard navigation helpers
  const announceToScreenReader = useCallback((message: string) => {
    if (!settings.screenReaderOptimized) return;

    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, [settings.screenReaderOptimized]);

  const focusElement = useCallback((elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.focus();
      
      if (settings.screenReaderOptimized) {
        announceToScreenReader(`Focused on ${element.getAttribute('aria-label') || element.textContent || 'element'}`);
      }
    }
  }, [settings.screenReaderOptimized, announceToScreenReader]);

  return {
    settings,
    isLoading,
    updateSetting,
    resetSettings,
    announceToScreenReader,
    focusElement,
    
    // Convenience methods
    toggleHighContrast: () => updateSetting('contrastMode', 
      settings.contrastMode === 'high' ? 'normal' : 'high'
    ),
    toggleOutdoorMode: () => updateSetting('contrastMode',
      settings.contrastMode === 'outdoor' ? 'normal' : 'outdoor'
    ),
    toggleScreenReader: () => updateSetting('screenReaderOptimized', 
      !settings.screenReaderOptimized
    ),
    increaseFontSize: () => {
      const sizes: FontSize[] = ['normal', 'large', 'extra-large'];
      const currentIndex = sizes.indexOf(settings.fontSize);
      const nextIndex = Math.min(currentIndex + 1, sizes.length - 1);
      updateSetting('fontSize', sizes[nextIndex]);
    },
    decreaseFontSize: () => {
      const sizes: FontSize[] = ['normal', 'large', 'extra-large'];
      const currentIndex = sizes.indexOf(settings.fontSize);
      const nextIndex = Math.max(currentIndex - 1, 0);
      updateSetting('fontSize', sizes[nextIndex]);
    }
  };
};