import { useCallback, useRef } from 'react';

interface LongPressOptions {
  delay?: number;
  shouldPreventDefault?: boolean;
  onStart?: () => void;
  onFinish?: () => void;
  onCancel?: () => void;
}

export const useLongPress = (
  onLongPress: () => void,
  options: LongPressOptions = {}
) => {
  const {
    delay = 500,
    shouldPreventDefault = true,
    onStart,
    onFinish,
    onCancel
  } = options;

  const timeoutRef = useRef<NodeJS.Timeout>();
  const isLongPressRef = useRef(false);

  const start = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    if (shouldPreventDefault && event.target) {
      event.target.addEventListener('touchend', preventDefault, { passive: false });
      event.target.addEventListener('click', preventDefault, { passive: false });
    }

    onStart?.();
    isLongPressRef.current = false;

    timeoutRef.current = setTimeout(() => {
      onLongPress();
      isLongPressRef.current = true;
      onFinish?.();
    }, delay);
  }, [onLongPress, delay, shouldPreventDefault, onStart, onFinish]);

  const clear = useCallback((event?: React.TouchEvent | React.MouseEvent, shouldTriggerClick = true) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (shouldPreventDefault && event?.target) {
      event.target.removeEventListener('touchend', preventDefault);
      event.target.removeEventListener('click', preventDefault);
    }

    if (!isLongPressRef.current && shouldTriggerClick) {
      onCancel?.();
    }
  }, [shouldPreventDefault, onCancel]);

  const preventDefault = (event: Event) => {
    if (!event.isTrusted) return;
    event.preventDefault();
    event.stopPropagation();
  };

  return {
    onMouseDown: (event: React.MouseEvent) => start(event),
    onMouseUp: (event: React.MouseEvent) => clear(event),
    onMouseLeave: (event: React.MouseEvent) => clear(event, false),
    onTouchStart: (event: React.TouchEvent) => start(event),
    onTouchEnd: (event: React.TouchEvent) => clear(event),
    onTouchCancel: (event: React.TouchEvent) => clear(event, false),
  };
};

// Hook for context menu with long press
export const useContextMenu = (
  items: Array<{
    label: string;
    action: () => void;
    icon?: React.ReactNode;
    destructive?: boolean;
  }>,
  options: LongPressOptions = {}
) => {
  const longPressProps = useLongPress(() => {
    // Show context menu
    const event = new CustomEvent('showContextMenu', { detail: items });
    window.dispatchEvent(event);
  }, options);

  return longPressProps;
};