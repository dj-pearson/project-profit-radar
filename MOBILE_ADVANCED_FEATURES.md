# BuildDesk Advanced Mobile Features

## Overview

This document covers the advanced mobile features added in Phase 2, including enhanced navigation and advanced gesture support.

## 🧭 Enhanced Navigation System

### Role-Based Navigation

The platform now includes **intelligent role-based navigation** that automatically adapts the bottom navigation bar based on the user's role:

#### Admin
- Home (Dashboard)
- Projects
- Financial
- People
- Admin

#### Project Manager
- Home
- Projects
- Schedule
- Reports
- Team

#### Field Supervisor
- Home
- Projects
- Schedule
- Safety
- Field

#### Accounting
- Home
- Financial
- Reports
- Invoices
- Settings

### Context-Aware Navigation

Navigation automatically changes based on the current page context:

**Project Detail Page:**
- Overview
- Documents
- Costs
- Schedule
- Changes

**Financial Section:**
- Dashboard
- Reports
- Estimates
- Projects
- Home

### Usage

```typescript
import { useMobileNavigation } from '@/hooks/useMobileNavigation';
import { EnhancedMobileBottomNav } from '@/components/mobile';

function MyPage() {
  const { items, userRole, isCustomContext } = useMobileNavigation();

  return (
    <>
      {/* Your page content */}
      <EnhancedMobileBottomNav />
    </>
  );
}
```

### Custom Navigation

Pages can define their own custom navigation items:

```typescript
import { EnhancedMobileBottomNav, type MobileNavItem } from '@/components/mobile';

const customItems: MobileNavItem[] = [
  { icon: Building2, label: 'Projects', href: '/projects-hub' },
  { icon: Calendar, label: 'Schedule', href: '/schedule' },
  { icon: Users, label: 'Team', href: '/team', badge: 3 },
];

<EnhancedMobileBottomNav customItems={customItems} showLabels={true} />
```

### Features

- **Haptic Feedback**: Vibration on navigation (where supported)
- **Active Indicators**: Visual feedback for current page
- **Badge Support**: Show notifications/counts on nav items
- **Compact Mode**: Smaller height for more screen space
- **Context Indicator**: Visual indicator when using contextual navigation

## 👆 Advanced Gesture System

### Long Press

Detect and respond to long press (press and hold) gestures:

```typescript
import { useLongPress } from '@/hooks';

const { isPressed, handlers } = useLongPress(
  () => console.log('Long pressed!'),
  {
    threshold: 500,  // milliseconds
    onStart: () => console.log('Press started'),
    onCancel: () => console.log('Press cancelled'),
  }
);

<div {...handlers}>
  Press and hold me
</div>
```

**Use Cases:**
- Context menus
- Delete confirmations
- Advanced selections
- Alternative actions

### Double Tap

Detect double tap gestures with single tap fallback:

```typescript
import { useDoubleTap } from '@/hooks';

const handlers = useDoubleTap(
  () => console.log('Double tapped!'),
  {
    threshold: 300,  // ms between taps
    onSingleTap: () => console.log('Single tap'),
  }
);

<div {...handlers}>
  Tap me twice
</div>
```

**Use Cases:**
- Like/favorite actions
- Zoom shortcuts
- Quick actions
- Image viewing

### Pinch to Zoom

Two-finger pinch gesture for scaling:

```typescript
import { usePinchZoom } from '@/hooks';

const { scale, isPinching, handlers, resetScale } = usePinchZoom(
  (newScale) => console.log('Scale:', newScale),
  {
    minScale: 0.5,
    maxScale: 3,
    onPinchStart: () => console.log('Started'),
    onPinchEnd: (finalScale) => console.log('Ended:', finalScale),
  }
);

<div {...handlers}>
  <img
    src="photo.jpg"
    style={{ transform: `scale(${scale})` }}
  />
</div>
```

**Use Cases:**
- Image viewers
- Map applications
- Blueprint viewing
- Document preview

### Drag Gesture

Drag and move elements:

```typescript
import { useDragGesture } from '@/hooks';

const [position, setPosition] = useState({ x: 0, y: 0 });

const { isDragging, handlers } = useDragGesture({
  onDragStart: (pos) => console.log('Drag started'),
  onDragMove: (pos, delta) => {
    setPosition(prev => ({
      x: prev.x + delta.x,
      y: prev.y + delta.y,
    }));
  },
  onDragEnd: (pos) => console.log('Drag ended'),
  threshold: 5,  // pixels before drag starts
});

<div
  {...handlers}
  style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
>
  Drag me
</div>
```

**Use Cases:**
- Reorderable lists
- Kanban boards
- Image positioning
- Custom sliders

### Rotation Gesture

Two-finger rotation:

```typescript
import { useRotationGesture } from '@/hooks';

const { angle, isRotating, handlers, resetAngle } = useRotationGesture(
  (newAngle) => console.log('Angle:', newAngle),
  {
    onRotateStart: () => console.log('Started rotating'),
    onRotateEnd: (finalAngle) => console.log('Final angle:', finalAngle),
  }
);

<div
  {...handlers}
  style={{ transform: `rotate(${angle}deg)` }}
>
  Rotate me with two fingers
</div>
```

**Use Cases:**
- Image editing
- Blueprint rotation
- Map orientation
- Creative tools

### Multi-Touch Gestures

Combined pinch, rotate, and pan:

```typescript
import { useMultiTouchGestures } from '@/hooks';

const { touchCount, handlers } = useMultiTouchGestures({
  onPinch: (scale) => console.log('Pinch:', scale),
  onRotate: (angle) => console.log('Rotate:', angle),
  onPan: (position) => console.log('Pan:', position),
});

<div {...handlers}>
  Multi-touch enabled element
</div>
```

**Use Cases:**
- Advanced image viewers
- CAD/blueprint tools
- Interactive maps
- Photo editing

## 📦 New Components

### EnhancedMobileBottomNav

Enhanced bottom navigation with role-based and context-aware items:

```typescript
<EnhancedMobileBottomNav
  customItems={myItems}
  showLabels={true}
  variant="default" // or "compact"
  className="custom-class"
/>
```

**Props:**
- `customItems?: MobileNavItem[]` - Override default navigation
- `showLabels?: boolean` - Show/hide labels (default: true)
- `variant?: 'default' | 'compact'` - Size variant
- `className?: string` - Additional CSS classes

### Gesture Demo Components

Pre-built demo components for showcasing gestures:

```typescript
import {
  LongPressDemo,
  DoubleTapDemo,
  PinchZoomDemo,
  DragDemo,
  RotationDemo,
  CombinedGesturesDemo
} from '@/components/mobile';

<LongPressDemo />
<DoubleTapDemo />
<PinchZoomDemo />
<DragDemo />
<RotationDemo />
<CombinedGesturesDemo />
```

## 🎯 Demo Pages

### Basic Mobile Showcase
**Route:** `/mobile-showcase`

Demonstrates:
- Basic mobile components
- Responsive layouts
- Form patterns
- Simple interactions

### Advanced Mobile Showcase
**Route:** `/mobile-showcase-advanced`

Demonstrates:
- All advanced gestures
- Role-based navigation
- Context-aware navigation
- Multi-touch interactions
- Complete implementation examples

## 🔧 API Reference

### useMobileNavigation

```typescript
const {
  items,           // MobileNavItem[] - Current navigation items
  activeHref,      // string - Current active route
  userRole,        // string - Current user's role
  isCustomContext, // boolean - Using context-aware nav
} = useMobileNavigation();
```

### useCustomNavigation

```typescript
const {
  items,      // MobileNavItem[] - Your custom items
  activeHref, // string - Current active route
} = useCustomNavigation(customItems);
```

### Gesture Hook Return Types

All gesture hooks follow similar patterns:

```typescript
// Long Press
interface UseLongPressReturn {
  isPressed: boolean;
  handlers: {
    onMouseDown, onMouseUp, onMouseLeave,
    onTouchStart, onTouchEnd, onTouchCancel
  };
}

// Pinch Zoom
interface UsePinchZoomReturn {
  scale: number;
  isPinching: boolean;
  handlers: TouchHandlers;
  resetScale: () => void;
}

// Drag
interface UseDragGestureReturn {
  isDragging: boolean;
  position: { x: number; y: number };
  hasMoved: boolean;
  handlers: MouseAndTouchHandlers;
}

// And so on...
```

## 🎨 Styling and Customization

### Bottom Navigation Variants

```typescript
// Default (16px height)
<EnhancedMobileBottomNav variant="default" />

// Compact (14px height)
<EnhancedMobileBottomNav variant="compact" />

// Without labels
<EnhancedMobileBottomNav showLabels={false} />
```

### Custom Styling

```typescript
<EnhancedMobileBottomNav
  className="custom-bg-color border-custom"
/>
```

### Badge Styling

```typescript
const items: MobileNavItem[] = [
  {
    icon: DollarSign,
    label: 'Finance',
    href: '/financial-hub',
    badge: 5,  // Number badge
  },
  {
    icon: Users,
    label: 'Team',
    href: '/team',
    badge: 'New',  // Text badge
  },
];
```

## 🚀 Performance Considerations

### Gesture Detection
- Passive event listeners for scroll performance
- Throttled gesture calculations
- Efficient re-render prevention
- Touch event optimization

### Navigation
- Cached role-based configurations
- Memoized navigation items
- Optimized route matching
- Minimal re-renders

## ✅ Best Practices

### Gestures
1. **Provide visual feedback** during gestures
2. **Show instructions** for complex gestures
3. **Allow cancellation** of long operations
4. **Set reasonable thresholds** (don't make gestures too sensitive)
5. **Test on real devices** (simulators don't capture all behaviors)

### Navigation
1. **Keep navigation consistent** within contexts
2. **Use badges sparingly** (only for important notifications)
3. **Provide context** when navigation changes
4. **Test role switching** to ensure proper items display
5. **Consider thumb reachability** for mobile layouts

### Accessibility
1. **Provide keyboard alternatives** for gestures
2. **Add ARIA labels** to navigation items
3. **Support screen readers** for all interactions
4. **Test with reduced motion** preferences
5. **Ensure sufficient touch targets** (44x44px minimum)

## 🐛 Troubleshooting

### Gestures not working
- Check if `touch-action: none` is set
- Verify event handlers are properly spread
- Test on actual device (not just browser DevTools)
- Check for conflicting gesture handlers

### Navigation not updating
- Verify user role is set correctly
- Check route matching logic
- Ensure context detection is working
- Clear cached navigation state

### Performance issues
- Reduce gesture calculation frequency
- Use `requestAnimationFrame` for animations
- Avoid expensive operations in gesture handlers
- Check for memory leaks in event listeners

## 📚 Additional Resources

- [Touch Events MDN](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)
- [Pointer Events MDN](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)
- [React Touch Handling](https://react.dev/learn/responding-to-events#touch-events)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/gestures)
- [Material Design Gestures](https://m3.material.io/foundations/interaction/gestures)

---

**BuildDesk** - Advanced Mobile Features for Construction Management
