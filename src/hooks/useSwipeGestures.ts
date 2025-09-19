import { useEffect, useRef } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface SwipeOptions {
  threshold?: number;
  preventDefaultTouchmoveEvent?: boolean;
}

export const useSwipeGestures = (
  handlers: SwipeHandlers,
  options: SwipeOptions = {}
) => {
  const {
    threshold = 50,
    preventDefaultTouchmoveEvent = false
  } = options;

  const elementRef = useRef<HTMLElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (preventDefaultTouchmoveEvent) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;

      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Determine if it's a swipe gesture
      if (Math.max(absDeltaX, absDeltaY) < threshold) {
        touchStartRef.current = null;
        return;
      }

      // Horizontal swipe is stronger
      if (absDeltaX > absDeltaY) {
        if (deltaX > 0) {
          handlers.onSwipeRight?.();
        } else {
          handlers.onSwipeLeft?.();
        }
      } 
      // Vertical swipe is stronger
      else {
        if (deltaY > 0) {
          handlers.onSwipeDown?.();
        } else {
          handlers.onSwipeUp?.();
        }
      }

      touchStartRef.current = null;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefaultTouchmoveEvent });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handlers, threshold, preventDefaultTouchmoveEvent]);

  return elementRef;
};

// Hook for pull-to-refresh functionality
export const usePullToRefresh = (
  onRefresh: () => Promise<void> | void,
  threshold: number = 80
) => {
  const elementRef = useRef<HTMLElement>(null);
  const refreshStateRef = useRef({
    startY: 0,
    isPulling: false,
    isRefreshing: false
  });

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if scrolled to top
      if (element.scrollTop === 0) {
        refreshStateRef.current.startY = e.touches[0].clientY;
        refreshStateRef.current.isPulling = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!refreshStateRef.current.isPulling || refreshStateRef.current.isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - refreshStateRef.current.startY;

      if (deltaY > threshold && element.scrollTop === 0) {
        // Add visual feedback class
        element.classList.add('pull-to-refresh-active');
      } else {
        element.classList.remove('pull-to-refresh-active');
      }
    };

    const handleTouchEnd = async (e: TouchEvent) => {
      if (!refreshStateRef.current.isPulling || refreshStateRef.current.isRefreshing) return;

      const endY = e.changedTouches[0].clientY;
      const deltaY = endY - refreshStateRef.current.startY;

      refreshStateRef.current.isPulling = false;
      element.classList.remove('pull-to-refresh-active');

      if (deltaY > threshold && element.scrollTop === 0) {
        refreshStateRef.current.isRefreshing = true;
        element.classList.add('refreshing');
        
        try {
          await onRefresh();
        } finally {
          refreshStateRef.current.isRefreshing = false;
          element.classList.remove('refreshing');
        }
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, threshold]);

  return elementRef;
};