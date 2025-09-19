import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Keyboard, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useGlobalShortcuts } from '@/hooks/useKeyboardShortcuts';

interface ShortcutItemProps {
  shortcut: {
    key: string;
    ctrlKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
    description: string;
    category?: string;
  };
}

const ShortcutItem = ({ shortcut }: ShortcutItemProps) => {
  const formatKeys = () => {
    const keys = [];
    if (shortcut.ctrlKey) keys.push('Ctrl');
    if (shortcut.altKey) keys.push('Alt');
    if (shortcut.shiftKey) keys.push('Shift');
    keys.push(shortcut.key.toUpperCase());
    return keys;
  };

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-foreground">{shortcut.description}</span>
      <div className="flex gap-1">
        {formatKeys().map((key, index) => (
          <Badge key={index} variant="outline" className="px-2 py-1 text-xs font-mono">
            {key}
          </Badge>
        ))}
      </div>
    </div>
  );
};

export const ShortcutsHelp = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const shortcuts = useGlobalShortcuts();

  useEffect(() => {
    const handleShowShortcuts = () => setIsOpen(true);
    window.addEventListener('showShortcutsHelp', handleShowShortcuts);
    return () => window.removeEventListener('showShortcutsHelp', handleShowShortcuts);
  }, []);

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = 'category' in shortcut ? shortcut.category || 'General' : 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, typeof shortcuts>);

  // Filter shortcuts based on search term
  const filteredGroups = Object.entries(groupedShortcuts).reduce((acc, [category, categoryShortcuts]) => {
    const filtered = categoryShortcuts.filter(shortcut =>
      shortcut.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shortcut.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as Record<string, typeof shortcuts>);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Speed up your workflow with these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search shortcuts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="overflow-y-auto max-h-[60vh] space-y-6">
            {Object.entries(filteredGroups).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  {category}
                </h3>
                <div className="space-y-1">
                  {categoryShortcuts.map((shortcut, index) => (
                    <ShortcutItem key={index} shortcut={shortcut} />
                  ))}
                </div>
                <Separator className="mt-4" />
              </div>
            ))}
            
            {Object.keys(filteredGroups).length === 0 && searchTerm && (
              <div className="text-center py-8 text-muted-foreground">
                <Keyboard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No shortcuts found matching "{searchTerm}"</p>
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
            <p className="font-medium mb-1">Pro Tips:</p>
            <ul className="space-y-1">
              <li>• Press <kbd className="bg-muted px-1.5 py-0.5 rounded">Ctrl+/</kbd> anytime to show this dialog</li>
              <li>• Most shortcuts work from anywhere in the app</li>
              <li>• Navigation shortcuts will redirect you to the appropriate page</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};