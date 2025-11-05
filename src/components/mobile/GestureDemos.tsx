import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  useLongPress,
  useDoubleTap,
  usePinchZoom,
  useDragGesture,
  useRotationGesture,
} from '@/hooks/useAdvancedGestures';
import { Hand, Move, ZoomIn, RotateCw, Check } from 'lucide-react';

/**
 * Long Press Demo Component
 */
export function LongPressDemo() {
  const [pressCount, setPressCount] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  const { isPressed, handlers } = useLongPress(
    () => {
      setPressCount(prev => prev + 1);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1000);
    },
    {
      threshold: 500,
      onStart: () => console.log('Long press started'),
    }
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hand className="h-5 w-5" />
          Long Press
        </CardTitle>
        <CardDescription>Press and hold for 500ms</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          {...handlers}
          className={cn(
            'relative h-32 rounded-lg border-2 border-dashed',
            'flex items-center justify-center',
            'transition-all duration-200',
            'cursor-pointer select-none',
            isPressed
              ? 'bg-primary/20 border-primary scale-95'
              : 'bg-muted border-muted-foreground/20',
            'active:scale-95'
          )}
        >
          {showSuccess ? (
            <div className="flex flex-col items-center gap-2 text-primary">
              <Check className="h-8 w-8" />
              <p className="text-sm font-medium">Success!</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Hand className={cn('h-8 w-8', isPressed && 'text-primary')} />
              <p className="text-sm font-medium">
                {isPressed ? 'Hold...' : 'Press & Hold'}
              </p>
            </div>
          )}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-3">
          Activations: <Badge variant="secondary">{pressCount}</Badge>
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Double Tap Demo Component
 */
export function DoubleTapDemo() {
  const [tapCount, setTapCount] = useState(0);
  const [doubleTapCount, setDoubleTapCount] = useState(0);
  const [lastAction, setLastAction] = useState<'single' | 'double' | null>(null);

  const doubleTapHandlers = useDoubleTap(
    () => {
      setDoubleTapCount(prev => prev + 1);
      setLastAction('double');
    },
    {
      onSingleTap: () => {
        setTapCount(prev => prev + 1);
        setLastAction('single');
      },
      threshold: 300,
    }
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hand className="h-5 w-5" />
          Double Tap
        </CardTitle>
        <CardDescription>Tap twice quickly</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          {...doubleTapHandlers}
          className={cn(
            'h-32 rounded-lg',
            'flex items-center justify-center',
            'transition-all duration-200',
            'cursor-pointer select-none',
            lastAction === 'double' ? 'bg-primary/20' : 'bg-muted',
            'active:scale-95'
          )}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-2">
              <Hand className="h-8 w-8" />
              <Hand className="h-8 w-8" />
            </div>
            <p className="text-sm font-medium">
              {lastAction === 'double' ? 'Double Tapped!' : 'Tap Twice'}
            </p>
          </div>
        </div>
        <div className="flex justify-around mt-3 text-sm text-muted-foreground">
          <span>
            Single: <Badge variant="secondary">{tapCount}</Badge>
          </span>
          <span>
            Double: <Badge variant="secondary">{doubleTapCount}</Badge>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Pinch Zoom Demo Component
 */
export function PinchZoomDemo() {
  const { scale, isPinching, handlers, resetScale } = usePinchZoom(
    (newScale) => console.log('Pinching:', newScale),
    {
      minScale: 0.5,
      maxScale: 3,
    }
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ZoomIn className="h-5 w-5" />
          Pinch to Zoom
        </CardTitle>
        <CardDescription>Use two fingers to zoom</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          {...handlers}
          className={cn(
            'h-48 rounded-lg bg-muted',
            'flex items-center justify-center',
            'overflow-hidden',
            'touch-none select-none',
            isPinching && 'bg-primary/10'
          )}
        >
          <div
            style={{
              transform: `scale(${scale})`,
              transition: isPinching ? 'none' : 'transform 0.2s',
            }}
            className="flex flex-col items-center gap-3"
          >
            <ZoomIn className="h-12 w-12 text-primary" />
            <p className="text-2xl font-bold">{scale.toFixed(2)}x</p>
            <p className="text-sm text-muted-foreground">
              {isPinching ? 'Pinching...' : 'Pinch with 2 fingers'}
            </p>
          </div>
        </div>
        <button
          onClick={resetScale}
          className="w-full mt-3 text-sm text-primary hover:underline"
        >
          Reset Scale
        </button>
      </CardContent>
    </Card>
  );
}

/**
 * Drag Demo Component
 */
export function DragDemo() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const { isDragging, handlers } = useDragGesture({
    onDragMove: (_, delta) => {
      setOffset(prev => ({
        x: prev.x + delta.x,
        y: prev.y + delta.y,
      }));
    },
    threshold: 5,
  });

  const resetPosition = () => setOffset({ x: 0, y: 0 });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Move className="h-5 w-5" />
          Drag
        </CardTitle>
        <CardDescription>Drag the element around</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative h-48 rounded-lg bg-muted overflow-hidden">
          <div
            {...handlers}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px)`,
            }}
            className={cn(
              'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
              'w-20 h-20 rounded-lg',
              'flex items-center justify-center',
              'cursor-move select-none',
              'transition-shadow',
              isDragging
                ? 'bg-primary shadow-lg scale-105'
                : 'bg-primary/80 shadow-md'
            )}
          >
            <Move className="h-8 w-8 text-white" />
          </div>
        </div>
        <div className="flex justify-between items-center mt-3">
          <p className="text-sm text-muted-foreground">
            Position: {offset.x.toFixed(0)}, {offset.y.toFixed(0)}
          </p>
          <button
            onClick={resetPosition}
            className="text-sm text-primary hover:underline"
          >
            Reset
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Rotation Demo Component
 */
export function RotationDemo() {
  const { angle, isRotating, handlers, resetAngle } = useRotationGesture(
    (newAngle) => console.log('Rotating:', newAngle)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCw className="h-5 w-5" />
          Rotation
        </CardTitle>
        <CardDescription>Rotate with two fingers</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          {...handlers}
          className={cn(
            'h-48 rounded-lg bg-muted',
            'flex items-center justify-center',
            'overflow-hidden',
            'touch-none select-none',
            isRotating && 'bg-primary/10'
          )}
        >
          <div
            style={{
              transform: `rotate(${angle}deg)`,
              transition: isRotating ? 'none' : 'transform 0.2s',
            }}
            className="flex flex-col items-center gap-3"
          >
            <RotateCw className="h-12 w-12 text-primary" />
            <p className="text-2xl font-bold">{angle.toFixed(0)}°</p>
            <p className="text-sm text-muted-foreground">
              {isRotating ? 'Rotating...' : 'Rotate with 2 fingers'}
            </p>
          </div>
        </div>
        <button
          onClick={resetAngle}
          className="w-full mt-3 text-sm text-primary hover:underline"
        >
          Reset Angle
        </button>
      </CardContent>
    </Card>
  );
}

/**
 * Combined Gestures Demo
 */
export function CombinedGesturesDemo() {
  const [state, setState] = useState({
    scale: 1,
    rotation: 0,
    position: { x: 0, y: 0 },
  });

  const pinchHandlers = usePinchZoom(
    (scale) => setState(prev => ({ ...prev, scale })),
    { minScale: 0.5, maxScale: 2 }
  );

  const rotationHandlers = useRotationGesture(
    (angle) => setState(prev => ({ ...prev, rotation: angle }))
  );

  const resetAll = () => {
    setState({ scale: 1, rotation: 0, position: { x: 0, y: 0 } });
    pinchHandlers.resetScale();
    rotationHandlers.resetAngle();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Combined Gestures</CardTitle>
        <CardDescription>Pinch and rotate simultaneously</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          {...pinchHandlers.handlers}
          {...rotationHandlers.handlers}
          className="h-56 rounded-lg bg-muted flex items-center justify-center overflow-hidden touch-none select-none"
        >
          <div
            style={{
              transform: `scale(${state.scale}) rotate(${state.rotation}deg)`,
              transition:
                pinchHandlers.isPinching || rotationHandlers.isRotating
                  ? 'none'
                  : 'transform 0.2s',
            }}
            className="flex flex-col items-center gap-2 p-6 bg-primary/20 rounded-lg"
          >
            <div className="flex gap-2">
              <ZoomIn className="h-8 w-8 text-primary" />
              <RotateCw className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{state.scale.toFixed(2)}x</p>
              <p className="text-lg font-bold">{state.rotation.toFixed(0)}°</p>
            </div>
          </div>
        </div>
        <button
          onClick={resetAll}
          className="w-full mt-3 text-sm text-primary hover:underline"
        >
          Reset All
        </button>
      </CardContent>
    </Card>
  );
}
