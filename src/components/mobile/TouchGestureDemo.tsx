import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp, 
  ArrowDown,
  ZoomIn,
  ZoomOut,
  Hand,
  Timer,
  TouchpadIcon
} from 'lucide-react';
import { useTouchGestures } from '@/hooks/useTouchGestures';

export const TouchGestureDemo = () => {
  const [lastGesture, setLastGesture] = useState<string>('');
  const [gestureCount, setGestureCount] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const demoAreaRef = useRef<HTMLDivElement>(null);

  const { isGesturing } = useTouchGestures(demoAreaRef, {
    onSwipe: (gesture) => {
      setLastGesture(`Swipe ${gesture.direction}`);
      setGestureCount(prev => prev + 1);
    },
    onPinch: (gesture) => {
      const action = gesture.scale! > 1 ? 'Zoom In' : 'Zoom Out';
      setLastGesture(`${action} (${gesture.scale?.toFixed(2)}x)`);
      setGestureCount(prev => prev + 1);
    },
    onPan: (gesture) => {
      setLastGesture(`Pan (${gesture.deltaX?.toFixed(0)}, ${gesture.deltaY?.toFixed(0)})`);
    },
    onTap: () => {
      setLastGesture('Tap');
      setGestureCount(prev => prev + 1);
    },
    onLongPress: () => {
      setLastGesture('Long Press');
      setGestureCount(prev => prev + 1);
    }
  });

  const reset = () => {
    setLastGesture('');
    setGestureCount(0);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Touch Gesture Testing</h3>
          <Badge variant={isGesturing ? "default" : "secondary"}>
            {isGesturing ? "Active" : "Idle"}
          </Badge>
        </div>

        {/* Demo Area */}
        <div
          ref={demoAreaRef}
          className={`
            relative w-full h-64 border-2 border-dashed rounded-lg
            flex items-center justify-center text-center
            transition-all duration-200 user-select-none
            ${isGesturing 
              ? 'border-primary bg-primary/5 scale-[0.98]' 
              : 'border-muted-foreground/30 bg-muted/20'
            }
          `}
          style={{ touchAction: 'none' }} // Prevent default touch behaviors
        >
          <div className="space-y-3">
            <TouchpadIcon className="w-12 h-12 mx-auto text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Touch Gesture Area</p>
              <p className="text-xs text-muted-foreground">
                Try swiping, pinching, tapping, or long pressing
              </p>
            </div>
            {lastGesture && (
              <Badge variant="outline" className="font-mono">
                {lastGesture}
              </Badge>
            )}
          </div>
        </div>

        {/* Gesture Instructions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="text-center space-y-1">
            <ArrowLeft className="w-6 h-6 mx-auto text-muted-foreground" />
            <p className="text-xs">Swipe Left</p>
          </div>
          <div className="text-center space-y-1">
            <ArrowRight className="w-6 h-6 mx-auto text-muted-foreground" />
            <p className="text-xs">Swipe Right</p>
          </div>
          <div className="text-center space-y-1">
            <ZoomIn className="w-6 h-6 mx-auto text-muted-foreground" />
            <p className="text-xs">Pinch Out</p>
          </div>
          <div className="text-center space-y-1">
            <Timer className="w-6 h-6 mx-auto text-muted-foreground" />
            <p className="text-xs">Long Press</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="text-sm">
            <span className="text-muted-foreground">Gestures detected: </span>
            <span className="font-semibold">{gestureCount}</span>
          </div>
          <Button onClick={reset} variant="outline" size="sm">
            Reset
          </Button>
        </div>
      </Card>
    </div>
  );
};