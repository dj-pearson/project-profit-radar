import { useState, useEffect, useRef, useCallback } from 'react';

interface TouchGesture {
  type: 'swipe' | 'pinch' | 'pan' | 'tap' | 'long-press';
  direction?: 'left' | 'right' | 'up' | 'down';
  scale?: number;
  deltaX?: number;
  deltaY?: number;
  duration?: number;
}

interface TouchGestureOptions {
  onSwipe?: (gesture: TouchGesture) => void;
  onPinch?: (gesture: TouchGesture) => void;
  onPan?: (gesture: TouchGesture) => void;
  onTap?: (gesture: TouchGesture) => void;
  onLongPress?: (gesture: TouchGesture) => void;
  swipeThreshold?: number;
  longPressThreshold?: number;
  pinchThreshold?: number;
}

export const useTouchGestures = (
  elementRef: React.RefObject<HTMLElement>,
  options: TouchGestureOptions = {}
) => {
  const {
    onSwipe,
    onPinch,
    onPan,
    onTap,
    onLongPress,
    swipeThreshold = 50,
    longPressThreshold = 500,
    pinchThreshold = 0.1
  } = options;

  const [isGesturing, setIsGesturing] = useState(false);
  const gestureState = useRef({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    startTime: 0,
    initialDistance: 0,
    currentDistance: 0,
    touchCount: 0,
    longPressTimer: null as NodeJS.Timeout | null
  });

  const calculateDistance = useCallback((touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    const state = gestureState.current;
    
    state.startX = touch.clientX;
    state.startY = touch.clientY;
    state.currentX = touch.clientX;
    state.currentY = touch.clientY;
    state.startTime = Date.now();
    state.touchCount = e.touches.length;
    
    setIsGesturing(true);

    // Handle pinch gestures
    if (e.touches.length === 2) {
      state.initialDistance = calculateDistance(e.touches[0], e.touches[1]);
      state.currentDistance = state.initialDistance;
    }

    // Set up long press detection
    if (e.touches.length === 1 && onLongPress) {
      state.longPressTimer = setTimeout(() => {
        onLongPress({
          type: 'long-press',
          duration: Date.now() - state.startTime
        });
      }, longPressThreshold) as any;
    }
  }, [calculateDistance, onLongPress, longPressThreshold]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault(); // Prevent scrolling during gestures
    
    const touch = e.touches[0];
    const state = gestureState.current;
    
    state.currentX = touch.clientX;
    state.currentY = touch.clientY;

    // Clear long press timer on movement
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }

    // Handle pinch gestures
    if (e.touches.length === 2 && onPinch) {
      const newDistance = calculateDistance(e.touches[0], e.touches[1]);
      const scale = newDistance / state.initialDistance;
      
      if (Math.abs(scale - 1) > pinchThreshold) {
        onPinch({
          type: 'pinch',
          scale
        });
      }
      
      state.currentDistance = newDistance;
    }

    // Handle pan gestures
    if (e.touches.length === 1 && onPan) {
      const deltaX = state.currentX - state.startX;
      const deltaY = state.currentY - state.startY;
      
      onPan({
        type: 'pan',
        deltaX,
        deltaY
      });
    }
  }, [calculateDistance, onPinch, onPan, pinchThreshold]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const state = gestureState.current;
    const deltaX = state.currentX - state.startX;
    const deltaY = state.currentY - state.startY;
    const duration = Date.now() - state.startTime;
    
    setIsGesturing(false);

    // Clear long press timer
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }

    // Handle swipe gestures
    if (Math.abs(deltaX) > swipeThreshold || Math.abs(deltaY) > swipeThreshold) {
      let direction: 'left' | 'right' | 'up' | 'down';
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      if (onSwipe) {
        onSwipe({
          type: 'swipe',
          direction,
          deltaX,
          deltaY,
          duration
        });
      }
    }
    // Handle tap gestures (short touch with minimal movement)
    else if (
      Math.abs(deltaX) < 10 && 
      Math.abs(deltaY) < 10 && 
      duration < 300 && 
      onTap
    ) {
      onTap({
        type: 'tap',
        duration
      });
    }
  }, [swipeThreshold, onSwipe, onTap]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    isGesturing
  };
};