import { useCallback, useRef } from 'react';

interface UseLongPressOptions {
  onLongPress: () => void;
  delay?: number;
  onClick?: () => void;
  enableHaptic?: boolean;
}

/**
 * Hook for detecting long press gestures
 * Supports both mouse and touch events
 */
export function useLongPress({
  onLongPress,
  delay = 500,
  onClick,
  enableHaptic = true,
}: UseLongPressOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isLongPress = useRef(false);

  const triggerHaptic = useCallback(() => {
    if (enableHaptic && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, [enableHaptic]);

  const start = useCallback(() => {
    isLongPress.current = false;
    timeoutRef.current = setTimeout(() => {
      isLongPress.current = true;
      triggerHaptic();
      onLongPress();
    }, delay);
  }, [onLongPress, delay, triggerHaptic]);

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const handleClick = useCallback(() => {
    if (!isLongPress.current && onClick) {
      onClick();
    }
  }, [onClick]);

  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchEnd: clear,
    onClick: handleClick,
  };
}
