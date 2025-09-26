import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, ArrowLeft, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  return (
    <>
      {/* Fixed FAB positioned at bottom right */}
      <div className={cn(
        "fixed bottom-6 right-6 z-50 flex flex-col gap-2",
        "sm:hidden", // Only show on mobile
        className
      )}>
        {/* Back button FAB - if needed */}
        {showBackButton && onBack && (
          <Button
            size="icon"
            onClick={onBack}
            className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        
        {/* Main navigation FAB */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              size="icon"
              className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
              onClick={() => {
                setIsOpen(true);
                onMenuOpen?.();
              }}
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            {children}
          </SheetContent>
        </Sheet>
      </div>

      {/* Overlay to prevent content from being hidden behind FAB */}
      <div className="h-20 sm:hidden" aria-hidden="true" />
    </>
  );
};