import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Home,
  FolderKanban,
  Users,
  MessageSquare,
  Settings,
  FileText,
  DollarSign,
  Clock,
  Package,
  BarChart3,
  Calendar,
  Building2,
  ArrowRight,
  Hash,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CommandAction {
  id: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  category: string;
  keywords?: string[];
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  /**
   * Custom trigger key combination (default: Ctrl+K)
   */
  triggerKey?: string;

  /**
   * Additional custom actions to include
   */
  customActions?: CommandAction[];
}

/**
 * CommandPalette - Quick navigation and action launcher
 *
 * Press Ctrl+K to open and quickly navigate to any page or execute actions.
 * Fuzzy search makes it easy to find what you need.
 */
export function CommandPalette({
  triggerKey = 'k',
  customActions = [],
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Define all available commands
  const defaultActions: CommandAction[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      label: 'Dashboard',
      description: 'Go to main dashboard',
      icon: Home,
      category: 'Navigation',
      keywords: ['home', 'main'],
      action: () => {
        navigate('/');
        setOpen(false);
      },
      shortcut: 'Ctrl+H',
    },
    {
      id: 'nav-projects',
      label: 'Projects',
      description: 'View all projects',
      icon: FolderKanban,
      category: 'Navigation',
      keywords: ['jobs', 'sites'],
      action: () => {
        navigate('/projects');
        setOpen(false);
      },
      shortcut: 'Ctrl+P',
    },
    {
      id: 'nav-team',
      label: 'Team Management',
      description: 'Manage team members',
      icon: Users,
      category: 'Navigation',
      keywords: ['people', 'crew', 'employees'],
      action: () => {
        navigate('/team');
        setOpen(false);
      },
      shortcut: 'Ctrl+T',
    },
    {
      id: 'nav-communication',
      label: 'Communication Hub',
      description: 'Messages and collaboration',
      icon: MessageSquare,
      category: 'Navigation',
      keywords: ['messages', 'chat', 'messaging'],
      action: () => {
        navigate('/communication');
        setOpen(false);
      },
      shortcut: 'Ctrl+C',
    },
    {
      id: 'nav-settings',
      label: 'Settings',
      description: 'Application settings',
      icon: Settings,
      category: 'Navigation',
      keywords: ['preferences', 'config'],
      action: () => {
        navigate('/settings');
        setOpen(false);
      },
      shortcut: 'Ctrl+S',
    },

    // Project Management
    {
      id: 'action-new-project',
      label: 'Create New Project',
      description: 'Start a new construction project',
      icon: FolderKanban,
      category: 'Project Management',
      keywords: ['create', 'add', 'new job'],
      action: () => {
        navigate('/projects/new');
        setOpen(false);
      },
      shortcut: 'Ctrl+N',
    },
    {
      id: 'nav-daily-reports',
      label: 'Daily Reports',
      description: 'View and create daily reports',
      icon: FileText,
      category: 'Reporting',
      keywords: ['daily', 'report', 'log'],
      action: () => {
        navigate('/reports/daily');
        setOpen(false);
      },
      shortcut: 'Ctrl+R',
    },
    {
      id: 'nav-change-orders',
      label: 'Change Orders',
      description: 'Manage change orders',
      icon: FileText,
      category: 'Project Management',
      keywords: ['changes', 'modifications'],
      action: () => {
        navigate('/change-orders');
        setOpen(false);
      },
    },

    // Financial
    {
      id: 'nav-job-costing',
      label: 'Job Costing',
      description: 'Track project costs',
      icon: DollarSign,
      category: 'Financial',
      keywords: ['costs', 'budget', 'expenses'],
      action: () => {
        navigate('/job-costing');
        setOpen(false);
      },
    },
    {
      id: 'action-new-invoice',
      label: 'Create Invoice',
      description: 'Generate a new invoice',
      icon: DollarSign,
      category: 'Financial',
      keywords: ['bill', 'billing', 'payment'],
      action: () => {
        navigate('/invoices/new');
        setOpen(false);
      },
      shortcut: 'Ctrl+I',
    },
    {
      id: 'nav-financial-reports',
      label: 'Financial Reports',
      description: 'View financial analytics',
      icon: BarChart3,
      category: 'Financial',
      keywords: ['analytics', 'stats', 'profit'],
      action: () => {
        navigate('/financial-reports');
        setOpen(false);
      },
    },

    // Time Management
    {
      id: 'nav-time-tracking',
      label: 'Time Tracking',
      description: 'Log time entries',
      icon: Clock,
      category: 'Time Management',
      keywords: ['timesheet', 'hours', 'log'],
      action: () => {
        navigate('/time-tracking');
        setOpen(false);
      },
      shortcut: 'Ctrl+Shift+T',
    },
    {
      id: 'nav-schedule',
      label: 'Schedule',
      description: 'View project schedules',
      icon: Calendar,
      category: 'Time Management',
      keywords: ['calendar', 'timeline', 'dates'],
      action: () => {
        navigate('/schedule');
        setOpen(false);
      },
    },

    // Materials
    {
      id: 'nav-materials',
      label: 'Materials Management',
      description: 'Track materials and inventory',
      icon: Package,
      category: 'Materials',
      keywords: ['inventory', 'supplies', 'stock'],
      action: () => {
        navigate('/materials');
        setOpen(false);
      },
      shortcut: 'Ctrl+M',
    },

    // Documents
    {
      id: 'nav-documents',
      label: 'Documents',
      description: 'View all documents',
      icon: FileText,
      category: 'Documents',
      keywords: ['files', 'attachments'],
      action: () => {
        navigate('/documents');
        setOpen(false);
      },
    },

    // Company
    {
      id: 'nav-company',
      label: 'Company Settings',
      description: 'Manage company information',
      icon: Building2,
      category: 'Settings',
      keywords: ['organization', 'business'],
      action: () => {
        navigate('/company');
        setOpen(false);
      },
    },
  ];

  const allActions = [...defaultActions, ...customActions];

  // Fuzzy search filtering
  const filteredActions = useMemo(() => {
    if (!searchQuery.trim()) {
      return allActions;
    }

    const query = searchQuery.toLowerCase();
    return allActions
      .filter(action => {
        const searchText = [
          action.label,
          action.description || '',
          action.category,
          ...(action.keywords || []),
        ].join(' ').toLowerCase();

        return searchText.includes(query);
      })
      .sort((a, b) => {
        // Prioritize label matches over description matches
        const aLabelMatch = a.label.toLowerCase().includes(query);
        const bLabelMatch = b.label.toLowerCase().includes(query);

        if (aLabelMatch && !bLabelMatch) return -1;
        if (!aLabelMatch && bLabelMatch) return 1;
        return 0;
      });
  }, [searchQuery, allActions]);

  // Group by category
  const groupedActions = useMemo(() => {
    const groups: Record<string, CommandAction[]> = {};

    filteredActions.forEach(action => {
      if (!groups[action.category]) {
        groups[action.category] = [];
      }
      groups[action.category].push(action);
    });

    return Object.entries(groups).map(([category, actions]) => ({
      category,
      actions,
    }));
  }, [filteredActions]);

  // Handle keyboard shortcuts to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard against undefined event.key (can happen with browser extensions)
      if (!e.key) return;

      if (e.ctrlKey && e.key === triggerKey) {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [triggerKey]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard against undefined event.key (can happen with browser extensions)
      if (!e.key) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev < filteredActions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredActions[selectedIndex]) {
            filteredActions[selectedIndex].action();
          }
          break;
        case 'Escape':
          e.preventDefault();
          setOpen(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, selectedIndex, filteredActions]);

  // Reset search and selection when opening/closing
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center border-b px-4 py-3">
          <Search className="h-5 w-5 text-muted-foreground mr-2" />
          <Input
            placeholder="Type a command or search..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto p-0"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto p-2">
          {filteredActions.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No results found for "{searchQuery}"
            </div>
          ) : (
            <div className="space-y-4">
              {groupedActions.map(({ category, actions }) => (
                <div key={category}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    {category}
                  </div>
                  <div className="space-y-1">
                    {actions.map((action, index) => {
                      const globalIndex = filteredActions.indexOf(action);
                      const Icon = action.icon || Hash;

                      return (
                        <button
                          key={action.id}
                          onClick={() => action.action()}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                            "hover:bg-muted/50",
                            globalIndex === selectedIndex && "bg-muted"
                          )}
                        >
                          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">
                              {action.label}
                            </div>
                            {action.description && (
                              <div className="text-xs text-muted-foreground truncate">
                                {action.description}
                              </div>
                            )}
                          </div>
                          {action.shortcut && (
                            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs text-muted-foreground shrink-0">
                              {action.shortcut}
                            </kbd>
                          )}
                          {globalIndex === selectedIndex && (
                            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border bg-muted">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded border bg-muted">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border bg-muted">Enter</kbd>
              Select
            </span>
          </div>
          <span className="flex items-center gap-1">
            Press
            <kbd className="px-1.5 py-0.5 rounded border bg-muted">Ctrl+K</kbd>
            to open
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
