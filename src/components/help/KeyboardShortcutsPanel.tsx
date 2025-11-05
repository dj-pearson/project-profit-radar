import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { Keyboard, Search, Command } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  description: string;
  category?: string;
}

interface KeyboardShortcutsPanelProps {
  /**
   * Keyboard shortcuts to display
   */
  shortcuts: KeyboardShortcut[];

  /**
   * Custom trigger shortcut (default: Ctrl+/)
   */
  triggerKey?: string;

  /**
   * Show the panel on mount
   */
  defaultOpen?: boolean;
}

/**
 * Format keyboard shortcut for display
 */
function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  // Use ⌘ for Mac, Ctrl for others
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  if (shortcut.ctrlKey) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.altKey) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  if (shortcut.shiftKey) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (shortcut.metaKey) {
    parts.push(isMac ? '⌘' : 'Win');
  }

  // Format the key
  let key = shortcut.key.toUpperCase();
  if (key === ' ') key = 'Space';
  if (key === '/') key = '/';

  parts.push(key);

  return parts.join(' + ');
}

/**
 * KeyboardShortcutsPanel - Discoverable keyboard shortcuts help
 *
 * Displays all available keyboard shortcuts in a searchable, categorized panel.
 * Triggered by Ctrl+/ by default.
 */
export function KeyboardShortcutsPanel({
  shortcuts,
  triggerKey = '/',
  defaultOpen = false,
}: KeyboardShortcutsPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [searchQuery, setSearchQuery] = useState("");

  // Listen for global shortcut trigger
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === triggerKey) {
        e.preventDefault();
        setOpen(true);
      }
    };

    // Also listen for custom event
    const handleCustomEvent = () => setOpen(true);
    window.addEventListener('showShortcutsHelp', handleCustomEvent);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('showShortcutsHelp', handleCustomEvent);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [triggerKey]);

  // Group shortcuts by category
  const categorizedShortcuts = useMemo(() => {
    const filtered = shortcuts.filter(s =>
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const grouped = filtered.reduce((acc, shortcut) => {
      const category = shortcut.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(shortcut);
      return acc;
    }, {} as Record<string, KeyboardShortcut[]>);

    // Sort categories
    const sortedCategories = Object.keys(grouped).sort();
    return sortedCategories.map(category => ({
      category,
      shortcuts: grouped[category],
    }));
  }, [shortcuts, searchQuery]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Keyboard className="h-6 w-6" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate BuildDesk faster. Press{" "}
            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
              Ctrl + /
            </kbd>{" "}
            anytime to open this panel.
          </DialogDescription>
        </DialogHeader>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        {/* Shortcuts list */}
        <div className="space-y-6">
          {categorizedShortcuts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No shortcuts found matching "{searchQuery}"
            </p>
          ) : (
            categorizedShortcuts.map(({ category, shortcuts }) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {shortcuts.map((shortcut, index) => (
                    <div
                      key={`${category}-${index}`}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <ShortcutBadge shortcut={shortcut} />
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer tip */}
        <div className="pt-4 border-t mt-6">
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Command className="h-3 w-3" />
            <span>
              Pro tip: Most shortcuts work from any page. Combine with Shift for additional actions.
            </span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * ShortcutBadge - Visual representation of a keyboard shortcut
 */
function ShortcutBadge({ shortcut }: { shortcut: KeyboardShortcut }) {
  const formatted = formatShortcut(shortcut);
  const keys = formatted.split(' + ');

  return (
    <div className="flex items-center gap-1">
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          <kbd
            className={cn(
              "px-2 py-1 text-xs font-semibold rounded-md",
              "bg-muted border border-border shadow-sm",
              "min-w-[2rem] text-center inline-block"
            )}
          >
            {key}
          </kbd>
          {index < keys.length - 1 && (
            <span className="text-muted-foreground text-xs">+</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/**
 * useKeyboardShortcutsPanel - Hook to control the panel programmatically
 */
export function useKeyboardShortcutsPanel() {
  const show = () => {
    const event = new CustomEvent('showShortcutsHelp');
    window.dispatchEvent(event);
  };

  return { show };
}
