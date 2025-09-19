import React, { createContext, useContext, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ContextMenuItem {
  label: string;
  action: () => void;
  icon?: React.ReactNode;
  destructive?: boolean;
}

interface ContextMenuState {
  isOpen: boolean;
  items: ContextMenuItem[];
  x: number;
  y: number;
}

const ContextMenuContext = createContext<{
  showContextMenu: (items: ContextMenuItem[], x?: number, y?: number) => void;
  hideContextMenu: () => void;
}>({
  showContextMenu: () => {},
  hideContextMenu: () => {}
});

export const useContextMenuProvider = () => useContext(ContextMenuContext);

export const ContextMenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [menuState, setMenuState] = useState<ContextMenuState>({
    isOpen: false,
    items: [],
    x: 0,
    y: 0
  });

  const showContextMenu = (items: ContextMenuItem[], x = 0, y = 0) => {
    setMenuState({
      isOpen: true,
      items,
      x,
      y
    });
  };

  const hideContextMenu = () => {
    setMenuState(prev => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    const handleShowContextMenu = (event: CustomEvent) => {
      const items = event.detail as ContextMenuItem[];
      showContextMenu(items);
    };

    const handleHideContextMenu = () => {
      hideContextMenu();
    };

    window.addEventListener('showContextMenu', handleShowContextMenu as EventListener);
    window.addEventListener('hideContextMenu', handleHideContextMenu);
    
    // Hide context menu on scroll or click outside
    window.addEventListener('scroll', handleHideContextMenu);
    window.addEventListener('click', handleHideContextMenu);

    return () => {
      window.removeEventListener('showContextMenu', handleShowContextMenu as EventListener);
      window.removeEventListener('hideContextMenu', handleHideContextMenu);
      window.removeEventListener('scroll', handleHideContextMenu);
      window.removeEventListener('click', handleHideContextMenu);
    };
  }, []);

  return (
    <ContextMenuContext.Provider value={{ showContextMenu, hideContextMenu }}>
      {children}
      
      {/* Context Menu Overlay */}
      {menuState.isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-transparent"
          onClick={hideContextMenu}
        >
          <div 
            className="absolute bg-popover text-popover-foreground border rounded-md shadow-lg py-2 min-w-48"
            style={{
              left: Math.min(menuState.x, window.innerWidth - 200),
              top: Math.min(menuState.y, window.innerHeight - (menuState.items.length * 40 + 20)),
              transform: 'translate(10px, 10px)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {menuState.items.map((item, index) => (
              <React.Fragment key={index}>
                <button
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-left transition-colors",
                    item.destructive && "text-destructive hover:text-destructive"
                  )}
                  onClick={() => {
                    item.action();
                    hideContextMenu();
                  }}
                >
                  {item.icon && (
                    <span className="flex-shrink-0">{item.icon}</span>
                  )}
                  <span>{item.label}</span>
                </button>
                {index < menuState.items.length - 1 && 
                  menuState.items[index + 1]?.destructive !== item.destructive && (
                    <div className="h-px bg-border my-1" />
                  )
                }
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </ContextMenuContext.Provider>
  );
};