import React, { useEffect } from 'react';
import { useAccessibility } from '@/hooks/useAccessibility';
import { useToast } from '@/hooks/use-toast';

export const AccessibilityShortcuts: React.FC = () => {
  const {
    toggleHighContrast,
    toggleOutdoorMode,
    increaseFontSize,
    decreaseFontSize,
    toggleScreenReader,
    announceToScreenReader,
    focusElement
  } = useAccessibility();
  
  const { toast } = useToast();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if Alt + Shift are pressed (accessibility shortcut pattern)
      if (!event.altKey || !event.shiftKey) return;

      // Prevent default browser behavior
      event.preventDefault();

      switch (event.key.toLowerCase()) {
        case 'c':
          toggleHighContrast();
          announceToScreenReader('High contrast mode toggled');
          toast({
            title: "Accessibility Shortcut",
            description: "High contrast mode toggled (Alt+Shift+C)",
          });
          break;

        case 'o':
          toggleOutdoorMode();
          announceToScreenReader('Outdoor mode toggled');
          toast({
            title: "Accessibility Shortcut",
            description: "Outdoor mode toggled (Alt+Shift+O)",
          });
          break;

        case 'plus':
        case '=':
          increaseFontSize();
          announceToScreenReader('Font size increased');
          toast({
            title: "Accessibility Shortcut",
            description: "Font size increased (Alt+Shift+=)",
          });
          break;

        case 'minus':
        case '_':
          decreaseFontSize();
          announceToScreenReader('Font size decreased');
          toast({
            title: "Accessibility Shortcut",
            description: "Font size decreased (Alt+Shift+-)",
          });
          break;

        case 's':
          toggleScreenReader();
          announceToScreenReader('Screen reader optimization toggled');
          toast({
            title: "Accessibility Shortcut",
            description: "Screen reader mode toggled (Alt+Shift+S)",
          });
          break;

        case 'h':
        case '?':
          // Focus on help or main navigation
          const mainNav = document.getElementById('main-navigation');
          const mainContent = document.getElementById('main-content');
          if (mainNav) {
            mainNav.focus();
            announceToScreenReader('Moved focus to main navigation');
          } else if (mainContent) {
            mainContent.focus();
            announceToScreenReader('Moved focus to main content');
          }
          break;

        case '1':
          focusElement('main-content');
          announceToScreenReader('Moved focus to main content');
          break;

        case '2':
          focusElement('sidebar');
          announceToScreenReader('Moved focus to sidebar');
          break;

        case '3':
          focusElement('search');
          announceToScreenReader('Moved focus to search');
          break;

        default:
          return; // Don't prevent default for unhandled keys
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    toggleHighContrast,
    toggleOutdoorMode,
    increaseFontSize,
    decreaseFontSize,
    toggleScreenReader,
    announceToScreenReader,
    focusElement,
    toast
  ]);

  return null; // This component only handles keyboard events
};

// Hook for components that need to register focusable elements
export const useAccessibilityFocus = (elementId: string, ref: React.RefObject<HTMLElement>) => {
  useEffect(() => {
    if (ref.current && elementId) {
      ref.current.id = elementId;
    }
  }, [elementId, ref]);
};