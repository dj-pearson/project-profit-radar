/**
 * Touch-Optimized Button Component
 * Ensures proper touch target sizes for mobile devices
 */

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getTouchButtonClasses, triggerHapticFeedback } from '@/lib/mobile-touch';

interface TouchOptimizedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  /** Touch target size */
  touchSize?: 'sm' | 'md' | 'lg';
  /** Enable haptic feedback */
  haptic?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Button component optimized for mobile touch interaction
 * - Minimum 44x44px touch targets
 * - Optional haptic feedback
 * - Proper spacing and padding
 */
export const TouchOptimizedButton = forwardRef<HTMLButtonElement, TouchOptimizedButtonProps>(
  ({ touchSize = 'md', haptic = false, onClick, className, children, ...props }, ref) => {
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (haptic) {
        triggerHapticFeedback('medium');
      }
      onClick?.(event);
    };

    return (
      <Button
        ref={ref}
        className={cn(getTouchButtonClasses(touchSize), className)}
        onClick={handleClick}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

TouchOptimizedButton.displayName = 'TouchOptimizedButton';
