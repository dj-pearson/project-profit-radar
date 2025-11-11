import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  description: string;
  action: () => void;
  category?: string;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Guard against undefined event.key (can happen with browser extensions)
      if (!event.key) return;

      const shortcut = shortcuts.find(s =>
        s.key.toLowerCase() === event.key.toLowerCase() &&
        !!s.ctrlKey === event.ctrlKey &&
        !!s.altKey === event.altKey &&
        !!s.shiftKey === event.shiftKey
      );

      if (shortcut) {
        event.preventDefault();
        shortcut.action();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

// Construction-specific shortcuts for the app
export const useGlobalShortcuts = () => {
  const navigate = useNavigate();

  const shortcuts: KeyboardShortcut[] = [
    // Navigation shortcuts
    {
      key: 'h',
      ctrlKey: true,
      description: 'Go to Dashboard',
      action: () => navigate('/'),
      category: 'Navigation'
    },
    {
      key: 'p',
      ctrlKey: true,
      description: 'Go to Projects',
      action: () => navigate('/projects'),
      category: 'Navigation'
    },
    {
      key: 't',
      ctrlKey: true,
      description: 'Go to Team Management',
      action: () => navigate('/team'),
      category: 'Navigation'
    },
    {
      key: 'c',
      ctrlKey: true,
      description: 'Go to Communication Hub',
      action: () => navigate('/communication'),
      category: 'Navigation'
    },
    {
      key: 's',
      ctrlKey: true,
      description: 'Go to Settings',
      action: () => navigate('/settings'),
      category: 'Navigation'
    },

    // Construction-specific actions
    {
      key: 'n',
      ctrlKey: true,
      description: 'Create New Project',
      action: () => {
        navigate('/projects/new');
        toast({
          title: "Quick Action",
          description: "Creating new project...",
        });
      },
      category: 'Project Management'
    },
    {
      key: 't',
      ctrlKey: true,
      shiftKey: true,
      description: 'Quick Time Entry',
      action: () => {
        navigate('/time-tracking');
        toast({
          title: "Time Entry",
          description: "Opening time tracking...",
        });
      },
      category: 'Time Management'
    },
    {
      key: 'r',
      ctrlKey: true,
      description: 'Daily Report',
      action: () => {
        navigate('/reports/daily');
        toast({
          title: "Daily Report",
          description: "Opening daily report form...",
        });
      },
      category: 'Reporting'
    },
    {
      key: 'm',
      ctrlKey: true,
      description: 'Materials Request',
      action: () => {
        navigate('/materials');
        toast({
          title: "Materials",
          description: "Opening materials management...",
        });
      },
      category: 'Materials'
    },
    {
      key: 'i',
      ctrlKey: true,
      description: 'Create Invoice',
      action: () => {
        navigate('/invoices/new');
        toast({
          title: "Invoice",
          description: "Creating new invoice...",
        });
      },
      category: 'Financial'
    },

    // Dashboard sections (Alt + number)
    {
      key: '1',
      altKey: true,
      description: 'Focus on Projects Section',
      action: () => {
        navigate('/');
        setTimeout(() => {
          const element = document.getElementById('projects-section');
          element?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      },
      category: 'Dashboard Navigation'
    },
    {
      key: '2',
      altKey: true,
      description: 'Focus on Financial Overview',
      action: () => {
        navigate('/');
        setTimeout(() => {
          const element = document.getElementById('financial-section');
          element?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      },
      category: 'Dashboard Navigation'
    },

    // Utility shortcuts
    {
      key: '/',
      ctrlKey: true,
      description: 'Show Keyboard Shortcuts Help',
      action: () => {
        const event = new CustomEvent('showShortcutsHelp');
        window.dispatchEvent(event);
      },
      category: 'Help'
    },
    {
      key: 'k',
      ctrlKey: true,
      description: 'Global Search',
      action: () => {
        const searchElement = document.getElementById('global-search');
        if (searchElement) {
          searchElement.focus();
        } else {
          toast({
            title: "Search",
            description: "Navigate to a page with search functionality",
          });
        }
      },
      category: 'Search'
    }
  ];

  useKeyboardShortcuts(shortcuts);
  return shortcuts;
};