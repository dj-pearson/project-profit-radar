import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  MobileQuickActionsSheet,
  useLongPressQuickActions,
} from './MobileQuickActionsSheet';

interface MobileNavigationFABProps {
  onBack?: () => void;
  onMenuOpen?: () => void;
  showBackButton?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export const MobileNavigationFAB: React.FC<MobileNavigationFABProps> = ({
  onBack,
  onMenuOpen,
  showBackButton = true,
  children,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const quickActions = useLongPressQuickActions(500);

  return (
    <>
      {/* Fixed FAB positioned at bottom right */}
      <div
        className={cn(
          'fixed right-4 z-50 flex flex-col gap-3',
          'sm:hidden',
          className
        )}
        style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Back button FAB — glass variant */}
        {showBackButton && onBack && (
          <Button
            size="icon"
            onClick={onBack}
            className={cn(
              'h-12 w-12 rounded-full glass-interactive',
              'text-foreground hover:bg-transparent',
              'tap-highlight-transparent'
            )}
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        {/* Main navigation FAB — tap opens side menu, long-press opens quick actions */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              size="icon"
              className={cn(
                'h-14 w-14 rounded-full',
                'bg-gradient-to-br from-primary to-[hsl(24_100%_34%)]',
                'text-primary-foreground ring-1 ring-inset ring-white/25',
                'shadow-ios-glow transition-all duration-[200ms] ease-ios',
                'active:scale-[0.94] tap-highlight-transparent'
              )}
              aria-label="Menu — long press for quick actions"
              onClick={() => {
                setIsOpen(true);
                onMenuOpen?.();
              }}
              {...quickActions.handlers}
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0 glass-thick border-r border-white/10 dark:border-white/5">
            {children}
          </SheetContent>
        </Sheet>
      </div>

      {/* Overlay to prevent content from being hidden behind FAB */}
      <div className="h-20 sm:hidden" aria-hidden="true" />

      <MobileQuickActionsSheet
        isOpen={quickActions.isOpen}
        onClose={() => quickActions.setIsOpen(false)}
      />
    </>
  );
};
