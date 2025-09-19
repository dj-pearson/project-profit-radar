import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useSwipeGestures } from '@/hooks/useSwipeGestures';

interface SwipeAction {
  label: string;
  action: () => void;
  icon?: React.ReactNode;
  className?: string;
  threshold?: number;
}

interface SwipeCardProps {
  children: React.ReactNode;
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
  className?: string;
  disabled?: boolean;
}

export const SwipeCard: React.FC<SwipeCardProps> = ({
  children,
  leftAction,
  rightAction,
  className,
  disabled = false
}) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);

  const handleSwipeStart = (e: React.TouchEvent) => {
    if (disabled) return;
    startXRef.current = e.touches[0].clientX;
    setIsAnimating(false);
  };

  const handleSwipeMove = (e: React.TouchEvent) => {
    if (disabled) return;
    
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - startXRef.current;
    
    // Limit swipe distance to prevent over-swiping
    const maxSwipe = 120;
    const limitedDelta = Math.max(-maxSwipe, Math.min(maxSwipe, deltaX));
    
    setSwipeOffset(limitedDelta);
  };

  const handleSwipeEnd = () => {
    if (disabled) return;
    
    setIsAnimating(true);
    
    const threshold = 60;
    
    if (swipeOffset > threshold && rightAction) {
      // Execute right action
      setTimeout(() => {
        rightAction.action();
        resetSwipe();
      }, 150);
    } else if (swipeOffset < -threshold && leftAction) {
      // Execute left action
      setTimeout(() => {
        leftAction.action();
        resetSwipe();
      }, 150);
    } else {
      // Reset to center
      resetSwipe();
    }
  };

  const resetSwipe = () => {
    setIsAnimating(true);
    setSwipeOffset(0);
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Background Actions */}
      {leftAction && (
        <div 
          className={cn(
            "absolute inset-y-0 left-0 flex items-center justify-center px-4 transition-all duration-200",
            leftAction.className || "bg-red-500 text-white",
            swipeOffset < -30 ? "opacity-100" : "opacity-0"
          )}
          style={{ width: Math.abs(Math.min(swipeOffset, 0)) }}
        >
          <div className="flex items-center gap-2">
            {leftAction.icon}
            <span className="text-sm font-medium">{leftAction.label}</span>
          </div>
        </div>
      )}
      
      {rightAction && (
        <div 
          className={cn(
            "absolute inset-y-0 right-0 flex items-center justify-center px-4 transition-all duration-200",
            rightAction.className || "bg-green-500 text-white",
            swipeOffset > 30 ? "opacity-100" : "opacity-0"
          )}
          style={{ width: Math.max(swipeOffset, 0) }}
        >
          <div className="flex items-center gap-2">
            {rightAction.icon}
            <span className="text-sm font-medium">{rightAction.label}</span>
          </div>
        </div>
      )}

      {/* Main Card Content */}
      <div
        ref={cardRef}
        className={cn(
          "relative z-10 bg-background transition-transform",
          isAnimating ? "duration-300 ease-out" : "duration-0",
          className
        )}
        style={{ 
          transform: `translateX(${swipeOffset}px)`,
          touchAction: disabled ? 'auto' : 'pan-y'
        }}
        onTouchStart={handleSwipeStart}
        onTouchMove={handleSwipeMove}
        onTouchEnd={handleSwipeEnd}
        onTouchCancel={resetSwipe}
      >
        {children}
      </div>

      {/* Swipe Indicator */}
      {(leftAction || rightAction) && !disabled && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-20">
          <div className="flex gap-1">
            {leftAction && (
              <div className={cn(
                "w-2 h-1 rounded-full transition-colors",
                swipeOffset < -30 ? "bg-red-400" : "bg-gray-300"
              )} />
            )}
            <div className={cn(
              "w-2 h-1 rounded-full transition-colors",
              Math.abs(swipeOffset) < 30 ? "bg-gray-600" : "bg-gray-300"
            )} />
            {rightAction && (
              <div className={cn(
                "w-2 h-1 rounded-full transition-colors",
                swipeOffset > 30 ? "bg-green-400" : "bg-gray-300"
              )} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Touch-optimized button component for work gloves
export const TouchButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary';
  size?: 'sm' | 'default' | 'lg' | 'xl';
  className?: string;
  disabled?: boolean;
}> = ({ 
  children, 
  onClick, 
  variant = 'default', 
  size = 'default', 
  className, 
  disabled = false 
}) => {
  const sizeClasses = {
    sm: 'min-h-[44px] min-w-[44px] px-4 py-2 text-sm',
    default: 'min-h-[48px] min-w-[48px] px-6 py-3 text-base',
    lg: 'min-h-[52px] min-w-[52px] px-8 py-4 text-lg',
    xl: 'min-h-[60px] min-w-[60px] px-10 py-5 text-xl'
  };

  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 touch-manipulation",
        "active:scale-95 select-none", // Touch feedback
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      style={{ 
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none'
      }}
    >
      {children}
    </button>
  );
};