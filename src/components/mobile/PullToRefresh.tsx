import { useState, useRef, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  threshold?: number;
  disabled?: boolean;
}

/**
 * Pull-to-refresh component for mobile
 */
export function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
  disabled = false,
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasCrossedThreshold = useRef(false);
  const haptics = useHaptics();

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    // Only start if at top of scroll
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;

    if (distance > 0) {
      // Add resistance - gets harder to pull as you go further
      const resistance = 0.5;
      const next = Math.min(distance * resistance, threshold * 1.5);
      setPullDistance(next);
      if (!hasCrossedThreshold.current && next >= threshold) {
        hasCrossedThreshold.current = true;
        haptics.reveal();
      } else if (hasCrossedThreshold.current && next < threshold) {
        hasCrossedThreshold.current = false;
      }
    }
  };

  const handleTouchEnd = async () => {
    if (disabled) return;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
        haptics.success();
      } finally {
        setIsRefreshing(false);
      }
    }

    hasCrossedThreshold.current = false;
    setIsPulling(false);
    setPullDistance(0);
  };

  const progress = Math.min((pullDistance / threshold) * 100, 100);
  const rotation = progress * 3.6; // Convert to degrees

  const isTriggered = pullDistance >= threshold;

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator — floating glass pill */}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-3 z-10 flex items-center justify-center"
        style={{
          opacity: pullDistance > 0 || isRefreshing ? 1 : 0,
          transform: `translate(-50%, ${Math.min(pullDistance, 72)}px) scale(${
            isTriggered || isRefreshing ? 1 : 0.9 + (pullDistance / threshold) * 0.1
          })`,
          transition: isPulling ? 'opacity 120ms ease-out' : 'all 260ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        aria-hidden="true"
      >
        <div
          className={cn(
            'glass-thick rounded-full shadow-ios-3 flex items-center gap-2 px-3 py-2',
            'ring-1 ring-inset ring-white/30 dark:ring-white/10',
            isTriggered && 'ring-primary/30'
          )}
        >
          <RefreshCw
            className={cn(
              'h-5 w-5 text-primary transition-transform duration-[180ms]',
              isRefreshing && 'animate-spin',
              isTriggered && !isRefreshing && 'scale-110'
            )}
            style={{
              transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: isRefreshing
            ? 'translateY(60px)'
            : `translateY(${Math.min(pullDistance * 0.5, 60)}px)`,
          transition: isPulling ? 'none' : 'transform 0.42s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
