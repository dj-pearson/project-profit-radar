import { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const shortcut = shortcuts.find(s => 
        s.key.toLowerCase() === event.key.toLowerCase() &&
        !!s.ctrlKey === event.ctrlKey &&
        !!s.altKey === event.altKey &&
        !!s.shiftKey === event.shiftKey &&
        !!s.metaKey === event.metaKey
      );

      if (shortcut) {
        event.preventDefault();
        shortcut.action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

// Global shortcuts for the app
export const useGlobalShortcuts = () => {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'k',
      ctrlKey: true,
      action: () => {
        // Open command palette or search
        console.log('Open search/command palette');
      },
      description: 'Open command palette'
    },
    {
      key: 'n',
      ctrlKey: true,
      action: () => {
        // Create new project
        window.location.href = '/create-project';
      },
      description: 'Create new project'
    },
    {
      key: 'd',
      ctrlKey: true,
      action: () => {
        // Go to dashboard
        window.location.href = '/dashboard';
      },
      description: 'Go to dashboard'
    },
    {
      key: '/',
      action: () => {
        // Focus search if available
        const searchInput = document.querySelector('[data-search]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      },
      description: 'Focus search'
    }
  ];

  useKeyboardShortcuts(shortcuts);
  return shortcuts;
};