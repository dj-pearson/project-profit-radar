import { useEffect, useRef, useState } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number; // Minimum distance in pixels
}

/**
 * Hook for detecting swipe gestures on touch devices
 */
export function useSwipeGesture(options: SwipeGestureOptions) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
  } = options;

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchEnd = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: TouchEvent) => {
    touchEnd.current = null;
    touchStart.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
  };

  const onTouchMove = (e: TouchEvent) => {
    touchEnd.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
  };

  const onTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;

    const deltaX = touchStart.current.x - touchEnd.current.x;
    const deltaY = touchStart.current.y - touchEnd.current.y;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Horizontal swipe
    if (absX > absY && absX > threshold) {
      if (deltaX > 0) {
        onSwipeLeft?.();
      } else {
        onSwipeRight?.();
      }
    }

    // Vertical swipe
    if (absY > absX && absY > threshold) {
      if (deltaY > 0) {
        onSwipeUp?.();
      } else {
        onSwipeDown?.();
      }
    }

    touchStart.current = null;
    touchEnd.current = null;
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}

/**
 * Hook for swipeable list items (delete, archive, etc.)
 */
export function useSwipeableItem(options: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}) {
  const [offset, setOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStart = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;

    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStart.current;

    // Limit swipe distance
    const maxSwipe = 100;
    const limitedDiff = Math.max(-maxSwipe, Math.min(maxSwipe, diff));
    setOffset(limitedDiff);
  };

  const onTouchEnd = () => {
    const threshold = options.threshold || 50;

    if (Math.abs(offset) > threshold) {
      if (offset > 0) {
        options.onSwipeRight?.();
      } else {
        options.onSwipeLeft?.();
      }
    }

    setOffset(0);
    setIsSwiping(false);
    touchStart.current = null;
  };

  return {
    offset,
    isSwiping,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
}

/**
 * Hook for pull-to-refresh gesture
 */
export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const threshold = 80;
  const touchStart = useRef<number | null>(null);
  const scrollY = useRef(0);

  const onTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      touchStart.current = e.touches[0].clientY;
      scrollY.current = window.scrollY;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStart.current === null || window.scrollY > 0) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStart.current;

    if (diff > 0) {
      setIsPulling(true);
      setPullDistance(Math.min(diff, threshold * 1.5));
    }
  };

  const onTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }

    setIsPulling(false);
    setPullDistance(0);
    touchStart.current = null;
  };

  return {
    isPulling,
    pullDistance,
    isRefreshing,
    shouldTrigger: pullDistance >= threshold,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
}
