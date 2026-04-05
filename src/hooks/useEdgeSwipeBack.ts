import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHaptics } from './useHaptics';

interface EdgeSwipeOptions {
  /** Pixels from the left edge where the swipe must start. */
  edgeThreshold?: number;
  /** Pixels of horizontal travel required to trigger. */
  triggerDistance?: number;
  /** Max vertical drift tolerated before the swipe is cancelled. */
  maxVerticalDrift?: number;
  /** Called on success instead of navigating back. */
  onSwipeBack?: () => void;
  /** Disable the gesture. */
  disabled?: boolean;
}

/**
 * iOS-style edge-swipe-to-go-back gesture. Attaches passive touch listeners
 * to document.body; fires haptic feedback and navigates back (or invokes
 * a custom handler) when the user drags from the left edge past the
 * trigger distance.
 */
export function useEdgeSwipeBack({
  edgeThreshold = 24,
  triggerDistance = 80,
  maxVerticalDrift = 60,
  onSwipeBack,
  disabled = false,
}: EdgeSwipeOptions = {}) {
  const navigate = useNavigate();
  const haptics = useHaptics();
  const state = useRef({
    active: false,
    startX: 0,
    startY: 0,
    fired: false,
  });

  useEffect(() => {
    if (disabled) return;
    if (typeof window === 'undefined') return;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      if (touch.clientX > edgeThreshold) return;
      state.current = {
        active: true,
        startX: touch.clientX,
        startY: touch.clientY,
        fired: false,
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      const s = state.current;
      if (!s.active || s.fired) return;
      const touch = e.touches[0];
      if (!touch) return;
      const dx = touch.clientX - s.startX;
      const dy = Math.abs(touch.clientY - s.startY);
      if (dy > maxVerticalDrift) {
        s.active = false;
        return;
      }
      if (dx >= triggerDistance) {
        s.fired = true;
        s.active = false;
        haptics.impact('medium');
        if (onSwipeBack) {
          onSwipeBack();
        } else {
          navigate(-1);
        }
      }
    };

    const onTouchEnd = () => {
      state.current.active = false;
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [disabled, edgeThreshold, triggerDistance, maxVerticalDrift, onSwipeBack, navigate, haptics]);
}
