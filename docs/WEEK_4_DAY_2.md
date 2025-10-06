# Week 4 Day 2: Touch Gestures & Mobile Interactions

## Touch Feedback Patterns

### Active States for Touch
```tsx
// Button with touch feedback
<button className="
  px-6 py-3
  active:scale-95          // Shrink on press
  active:opacity-80        // Dim on press
  transition-all duration-150
  touch-manipulation       // Disable double-tap zoom
">
  Touch Me
</button>

// Card with ripple effect
<div className="
  p-4 rounded-lg
  cursor-pointer
  active:bg-muted/50
  transition-colors
  select-none              // Prevent text selection
  touch-manipulation
">
  Touchable Card
</div>
```

### Disable Text Selection on Interactive Elements
```tsx
// Prevent text selection on buttons/cards
<div className="
  select-none              // No text selection
  touch-manipulation       // Disable double-tap zoom
  cursor-pointer
">
  Interactive Element
</div>

// Allow text selection for reading content
<p className="select-text">
  This text can be selected and copied
</p>
```

## Swipe Actions

### Swipeable List Items
```tsx
import { useState } from 'react';

function SwipeableListItem({ 
  children, 
  onDelete, 
  onArchive 
}: SwipeableListItemProps) {
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [offset, setOffset] = useState(0);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
    const distance = touchStart - e.targetTouches[0].clientX;
    setOffset(-distance);
  };

  const onTouchEnd = () => {
    if (!touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      // Swipe left - show delete
      setOffset(-80);
    } else if (isRightSwipe) {
      // Swipe right - show archive
      setOffset(80);
    } else {
      // Reset
      setOffset(0);
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Left action (archive) */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-blue-500 flex items-center justify-center">
        <Archive className="h-5 w-5 text-white" />
      </div>

      {/* Right action (delete) */}
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-destructive flex items-center justify-center">
        <Trash2 className="h-5 w-5 text-white" />
      </div>

      {/* Main content */}
      <div
        className="bg-background relative transition-transform duration-200"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
```

## Pull-to-Refresh

### Custom Pull-to-Refresh Implementation
```tsx
import { useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

function PullToRefresh({ 
  onRefresh, 
  children 
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);

  const threshold = 80; // Pull distance needed to trigger refresh

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only start if at top of scroll
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;

    if (distance > 0) {
      setPullDistance(Math.min(distance, threshold * 1.5));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setIsPulling(false);
    setPullDistance(0);
  };

  const progress = Math.min((pullDistance / threshold) * 100, 100);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Pull indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all"
        style={{
          height: `${pullDistance}px`,
          opacity: pullDistance > 0 ? 1 : 0,
        }}
      >
        <RefreshCw
          className={cn(
            'h-6 w-6 text-primary transition-transform',
            isRefreshing && 'animate-spin',
            pullDistance >= threshold && 'scale-110'
          )}
          style={{
            transform: `rotate(${progress * 3.6}deg)`,
          }}
        />
      </div>

      {/* Content */}
      <div
        style={{
          transform: isRefreshing
            ? 'translateY(60px)'
            : `translateY(${Math.min(pullDistance * 0.5, 60)}px)`,
          transition: isPulling ? 'none' : 'transform 0.3s',
        }}
      >
        {children}
      </div>
    </div>
  );
}
```

## Long Press Actions

### Long Press Hook
```tsx
import { useCallback, useRef } from 'react';

interface UseLongPressOptions {
  onLongPress: () => void;
  delay?: number;
  onClick?: () => void;
}

export function useLongPress({
  onLongPress,
  delay = 500,
  onClick,
}: UseLongPressOptions) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const isLongPress = useRef(false);

  const start = useCallback(() => {
    isLongPress.current = false;
    timeoutRef.current = setTimeout(() => {
      isLongPress.current = true;
      onLongPress();
      // Haptic feedback (if supported)
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, delay);
  }, [onLongPress, delay]);

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

// Usage
function ImageGallery() {
  const longPressProps = useLongPress({
    onLongPress: () => console.log('Long press detected'),
    onClick: () => console.log('Normal click'),
    delay: 500,
  });

  return (
    <div
      {...longPressProps}
      className="cursor-pointer select-none"
    >
      <img src="image.jpg" alt="Gallery" />
    </div>
  );
}
```

## Gesture Recognition

### Pinch to Zoom
```tsx
import { useState, useRef } from 'react';

function PinchToZoom({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);
  const [lastScale, setLastScale] = useState(1);
  const initialDistance = useRef(0);

  const getDistance = (touches: TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      initialDistance.current = getDistance(e.touches);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const distance = getDistance(e.touches);
      const newScale = (distance / initialDistance.current) * lastScale;
      setScale(Math.min(Math.max(newScale, 1), 4)); // Min 1x, max 4x
    }
  };

  const handleTouchEnd = () => {
    setLastScale(scale);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="overflow-hidden touch-none"
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transition: 'transform 0.1s',
        }}
        className="origin-center"
      >
        {children}
      </div>
    </div>
  );
}
```

## Haptic Feedback

### Native Vibration API
```typescript
// Simple vibration
export function vibrateShort() {
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

export function vibrateMedium() {
  if ('vibrate' in navigator) {
    navigator.vibrate(50);
  }
}

export function vibrateLong() {
  if ('vibrate' in navigator) {
    navigator.vibrate(100);
  }
}

// Pattern vibration (success)
export function vibrateSuccess() {
  if ('vibrate' in navigator) {
    navigator.vibrate([10, 50, 10]);
  }
}

// Pattern vibration (error)
export function vibrateError() {
  if ('vibrate' in navigator) {
    navigator.vibrate([50, 50, 50]);
  }
}

// Usage in components
function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const handleDelete = () => {
    vibrateMedium(); // Haptic feedback
    onDelete();
  };

  return (
    <Button onClick={handleDelete} variant="destructive">
      Delete
    </Button>
  );
}
```

## Touch-Optimized Interactions

### Bottom Sheet for Mobile
```tsx
import { useState } from 'react';
import { X } from 'lucide-react';

function BottomSheet({ 
  isOpen, 
  onClose, 
  children 
}: BottomSheetProps) {
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    const distance = currentY - startY;
    if (distance > 100) {
      onClose();
    }
    setCurrentY(0);
    setStartY(0);
  };

  if (!isOpen) return null;

  const translateY = currentY > startY ? currentY - startY : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-background rounded-t-xl z-50 max-h-[85vh]"
        style={{
          transform: `translateY(${translateY}px)`,
          transition: currentY === 0 ? 'transform 0.3s' : 'none',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-4rem)]">
          {children}
        </div>
      </div>
    </>
  );
}
```

### Horizontal Scroll Snap
```tsx
// Snap scrolling for image galleries
<div className="
  flex gap-4 
  overflow-x-auto 
  snap-x snap-mandatory
  scrollbar-hide
  pb-4
  -mx-4 px-4
">
  {images.map((image, i) => (
    <div
      key={i}
      className="
        flex-shrink-0 
        w-[85vw] 
        md:w-96
        snap-center
        snap-always
      "
    >
      <img
        src={image}
        alt={`Image ${i + 1}`}
        className="w-full h-64 object-cover rounded-lg"
      />
    </div>
  ))}
</div>
```

## Mobile Gesture Best Practices

### Do's
- ✅ Provide immediate visual feedback for touches
- ✅ Use active states (scale, opacity changes)
- ✅ Add haptic feedback for important actions
- ✅ Support common gestures (swipe, long-press)
- ✅ Make swipeable areas obvious
- ✅ Use pull-to-refresh for lists
- ✅ Disable text selection on interactive elements
- ✅ Use `touch-manipulation` to disable double-tap zoom

### Don'ts
- ❌ Don't rely on hover states
- ❌ Don't make gestures the only way to access features
- ❌ Don't use custom gestures without teaching users
- ❌ Don't ignore safe areas on notched devices
- ❌ Don't prevent pinch-zoom on content
- ❌ Don't make touch targets smaller than 44px

## Testing Checklist

### Touch Interaction Testing
- [ ] All interactive elements have active states
- [ ] Touch targets are minimum 44×44px
- [ ] No accidental text selection on buttons
- [ ] Swipe gestures work smoothly
- [ ] Pull-to-refresh triggers at correct threshold
- [ ] Long-press actions have visual feedback
- [ ] Haptic feedback works (if implemented)
- [ ] Bottom sheets can be dragged to close
- [ ] Horizontal scrolling snaps correctly

### Device-Specific Testing
- [ ] Test on iOS Safari (gesture behavior)
- [ ] Test on Android Chrome (gesture behavior)
- [ ] Test with reduced motion setting
- [ ] Test on notched devices (safe areas)
- [ ] Test in portrait and landscape
- [ ] Test with slow network (loading states)

## Definition of Done

- ✅ Active states on all touchable elements
- ✅ Swipe actions implemented where appropriate
- ✅ Pull-to-refresh on list views
- ✅ Long-press actions with feedback
- ✅ Haptic feedback for key actions
- ✅ Bottom sheets dismissible by swipe
- ✅ No text selection on interactive elements
- ✅ Tested on iOS and Android devices
- ✅ Gestures feel smooth and responsive
- ✅ Alternative access methods for all gestures

## Next Steps: Week 4 Day 3
- Progressive Web App (PWA) setup
- Service worker implementation
- Offline functionality
- Install prompts
