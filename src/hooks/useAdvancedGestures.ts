import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * Hook for long press gesture
 */
export function useLongPress(
  onLongPress: () => void,
  options: {
    threshold?: number; // milliseconds
    onStart?: () => void;
    onCancel?: () => void;
  } = {}
) {
  const { threshold = 500, onStart, onCancel } = options;
  const timeoutRef = useRef<number | null>(null);
  const [isPressed, setIsPressed] = useState(false);

  const start = useCallback(() => {
    setIsPressed(true);
    onStart?.();

    timeoutRef.current = setTimeout(() => {
      onLongPress();
      setIsPressed(false);
    }, threshold) as unknown as number;
  }, [onLongPress, threshold, onStart]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (isPressed) {
      onCancel?.();
      setIsPressed(false);
    }
  }, [isPressed, onCancel]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isPressed,
    handlers: {
      onMouseDown: start,
      onMouseUp: cancel,
      onMouseLeave: cancel,
      onTouchStart: start,
      onTouchEnd: cancel,
      onTouchCancel: cancel,
    },
  };
}

/**
 * Hook for double tap gesture
 */
export function useDoubleTap(
  onDoubleTap: () => void,
  options: {
    threshold?: number; // milliseconds between taps
    onSingleTap?: () => void;
  } = {}
) {
  const { threshold = 300, onSingleTap } = options;
  const lastTapRef = useRef<number>(0);
  const tapTimeoutRef = useRef<number | null>(null);

  const handleTap = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < threshold && timeSinceLastTap > 0) {
      // Double tap detected
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      onDoubleTap();
      lastTapRef.current = 0;
    } else {
      // First tap - wait for potential second tap
      lastTapRef.current = now;

      if (onSingleTap) {
        tapTimeoutRef.current = setTimeout(() => {
          onSingleTap();
        }, threshold) as unknown as number;
      }
    }
  }, [onDoubleTap, onSingleTap, threshold]);

  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
    };
  }, []);

  return {
    onTouchEnd: handleTap,
    onClick: handleTap,
  };
}

/**
 * Hook for pinch-to-zoom gesture
 */
export function usePinchZoom(
  onPinch: (scale: number) => void,
  options: {
    minScale?: number;
    maxScale?: number;
    onPinchStart?: () => void;
    onPinchEnd?: (finalScale: number) => void;
  } = {}
) {
  const { minScale = 0.5, maxScale = 3, onPinchStart, onPinchEnd } = options;
  const [scale, setScale] = useState(1);
  const [isPinching, setIsPinching] = useState(false);
  const initialDistanceRef = useRef<number>(0);
  const initialScaleRef = useRef<number>(1);

  const getDistance = (touches: React.TouchList): number => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setIsPinching(true);
      initialDistanceRef.current = getDistance(e.touches);
      initialScaleRef.current = scale;
      onPinchStart?.();
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && isPinching) {
      const currentDistance = getDistance(e.touches);
      const scaleChange = currentDistance / initialDistanceRef.current;
      const newScale = Math.max(
        minScale,
        Math.min(maxScale, initialScaleRef.current * scaleChange)
      );

      setScale(newScale);
      onPinch(newScale);
    }
  };

  const onTouchEnd = () => {
    if (isPinching) {
      setIsPinching(false);
      onPinchEnd?.(scale);
    }
  };

  return {
    scale,
    isPinching,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: onTouchEnd,
    },
    resetScale: () => setScale(1),
  };
}

/**
 * Hook for drag gesture
 */
export function useDragGesture(
  options: {
    onDragStart?: (position: { x: number; y: number }) => void;
    onDragMove?: (position: { x: number; y: number }, delta: { x: number; y: number }) => void;
    onDragEnd?: (position: { x: number; y: number }) => void;
    threshold?: number;
  } = {}
) {
  const { onDragStart, onDragMove, onDragEnd, threshold = 5 } = options;

  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const startPosRef = useRef({ x: 0, y: 0 });
  const lastPosRef = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  const handleStart = (clientX: number, clientY: number) => {
    startPosRef.current = { x: clientX, y: clientY };
    lastPosRef.current = { x: clientX, y: clientY };
    hasMoved.current = false;
    setPosition({ x: clientX, y: clientY });
  };

  const handleMove = (clientX: number, clientY: number) => {
    const deltaX = clientX - startPosRef.current.x;
    const deltaY = clientY - startPosRef.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (!isDragging && distance > threshold) {
      setIsDragging(true);
      hasMoved.current = true;
      onDragStart?.(startPosRef.current);
    }

    if (isDragging) {
      const moveDelta = {
        x: clientX - lastPosRef.current.x,
        y: clientY - lastPosRef.current.y,
      };
      setPosition({ x: clientX, y: clientY });
      lastPosRef.current = { x: clientX, y: clientY };
      onDragMove?.({ x: clientX, y: clientY }, moveDelta);
    }
  };

  const handleEnd = () => {
    if (isDragging) {
      onDragEnd?.(position);
    }
    setIsDragging(false);
    hasMoved.current = false;
  };

  return {
    isDragging,
    position,
    hasMoved: hasMoved.current,
    handlers: {
      onMouseDown: (e: React.MouseEvent) => handleStart(e.clientX, e.clientY),
      onMouseMove: (e: React.MouseEvent) => {
        if (e.buttons === 1) handleMove(e.clientX, e.clientY);
      },
      onMouseUp: handleEnd,
      onMouseLeave: handleEnd,
      onTouchStart: (e: React.TouchEvent) => {
        const touch = e.touches[0];
        handleStart(touch.clientX, touch.clientY);
      },
      onTouchMove: (e: React.TouchEvent) => {
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
      },
      onTouchEnd: handleEnd,
      onTouchCancel: handleEnd,
    },
  };
}

/**
 * Hook for rotation gesture (two-finger rotation on touch devices)
 */
export function useRotationGesture(
  onRotate: (angle: number) => void,
  options: {
    onRotateStart?: () => void;
    onRotateEnd?: (angle: number) => void;
  } = {}
) {
  const { onRotateStart, onRotateEnd } = options;
  const [angle, setAngle] = useState(0);
  const [isRotating, setIsRotating] = useState(false);
  const initialAngleRef = useRef(0);
  const currentAngleRef = useRef(0);

  const getAngle = (touches: React.TouchList): number => {
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setIsRotating(true);
      initialAngleRef.current = getAngle(e.touches);
      currentAngleRef.current = angle;
      onRotateStart?.();
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && isRotating) {
      const currentAngle = getAngle(e.touches);
      const angleDiff = currentAngle - initialAngleRef.current;
      const newAngle = currentAngleRef.current + angleDiff;

      setAngle(newAngle);
      onRotate(newAngle);
    }
  };

  const onTouchEnd = () => {
    if (isRotating) {
      setIsRotating(false);
      onRotateEnd?.(angle);
    }
  };

  return {
    angle,
    isRotating,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: onTouchEnd,
    },
    resetAngle: () => setAngle(0),
  };
}

/**
 * Combined multi-touch gesture hook
 */
export function useMultiTouchGestures(options: {
  onPinch?: (scale: number) => void;
  onRotate?: (angle: number) => void;
  onPan?: (position: { x: number; y: number }) => void;
}) {
  const { onPinch, onRotate, onPan } = options;

  const [touchCount, setTouchCount] = useState(0);
  const initialStateRef = useRef<{
    distance: number;
    angle: number;
    centerX: number;
    centerY: number;
    scale: number;
    rotation: number;
  } | null>(null);

  const getDistance = (touches: React.TouchList): number => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getAngle = (touches: React.TouchList): number => {
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  };

  const getCenter = (touches: React.TouchList): { x: number; y: number } => {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchCount(e.touches.length);

    if (e.touches.length === 2) {
      const center = getCenter(e.touches);
      initialStateRef.current = {
        distance: getDistance(e.touches),
        angle: getAngle(e.touches),
        centerX: center.x,
        centerY: center.y,
        scale: 1,
        rotation: 0,
      };
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialStateRef.current) {
      const initial = initialStateRef.current;
      const currentDistance = getDistance(e.touches);
      const currentAngle = getAngle(e.touches);
      const center = getCenter(e.touches);

      // Calculate scale
      const scale = currentDistance / initial.distance;
      onPinch?.(scale);

      // Calculate rotation
      const rotation = currentAngle - initial.angle;
      onRotate?.(rotation);

      // Calculate pan
      onPan?.({
        x: center.x - initial.centerX,
        y: center.y - initial.centerY,
      });
    }
  };

  const onTouchEnd = () => {
    setTouchCount(0);
    initialStateRef.current = null;
  };

  return {
    touchCount,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: onTouchEnd,
    },
  };
}
