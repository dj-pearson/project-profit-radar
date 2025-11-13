# Implementation Guide

**Last Updated:** 2025-11-13
**Version:** 1.0
**Status:** Production Ready

---

## Overview

This guide covers how to implement and use all the new performance, accessibility, and mobile features added to BuildDesk. All components are production-ready, fully tested, and follow WCAG 2.1 AA accessibility standards.

---

## Table of Contents

1. [Skeleton Loading States](#skeleton-loading-states)
2. [Progressive Image Loading](#progressive-image-loading)
3. [Accessibility Components](#accessibility-components)
4. [Mobile Features](#mobile-features)
5. [Touch Optimization](#touch-optimization)
6. [Performance Monitoring](#performance-monitoring)
7. [Best Practices](#best-practices)

---

## Skeleton Loading States

### Overview
Pre-built skeleton components that show loading placeholders while content loads. Reduces layout shift and improves perceived performance.

### Available Skeletons
- `CardSkeleton` - Card with header and content
- `TableSkeleton` - Full table with rows
- `ListSkeleton` - List of items
- `DashboardSkeleton` - Complete dashboard layout
- `FormSkeleton` - Form with fields
- `StatCardSkeleton` - Dashboard stat card
- `ProjectCardSkeleton` - Project card
- `PageHeaderSkeleton` - Page header
- `DataTablePageSkeleton` - Full data table page
- `ChartCardSkeleton` - Chart card
- `PageSkeleton` - Full page layout

### Basic Usage

```tsx
import { CardSkeleton, TableSkeleton } from '@/components/ui/skeletons';

function MyComponent() {
  const { data, isLoading } = useQuery('my-data', fetchData);

  if (isLoading) {
    return <CardSkeleton />;
  }

  return <Card>{/* Your content */}</Card>;
}
```

### With Suspense

```tsx
import { SuspenseLoader } from '@/components/performance/SuspenseLoader';

function MyPage() {
  return (
    <SuspenseLoader type="dashboard">
      <LazyDashboard />
    </SuspenseLoader>
  );
}
```

### Custom Skeleton

```tsx
import { Skeleton } from '@/components/ui/skeleton';

function CustomSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}
```

---

## Progressive Image Loading

### Overview
Optimized image components with lazy loading, blur-up effect, and progressive enhancement.

### ProgressiveImage

Full-featured progressive image with Intersection Observer lazy loading.

```tsx
import { ProgressiveImage } from '@/components/performance/ProgressiveImage';

function ProjectGallery() {
  return (
    <ProgressiveImage
      src="/project-image-full.jpg"
      placeholder="/project-image-thumb.jpg"  // Optional low-res placeholder
      alt="Construction site overview"
      aspectRatio="16/9"
      lazy={true}  // Default: true
      onLoad={() => console.log('Image loaded')}
      className="rounded-lg"
    />
  );
}
```

**Features:**
- Blur-up transition from placeholder
- Lazy loading with 50px preload margin
- Automatic error state
- Aspect ratio preservation
- Loading state

### LazyImage

Simple lazy image using native loading attribute.

```tsx
import { LazyImage } from '@/components/performance/ProgressiveImage';

function SimpleImage() {
  return (
    <LazyImage
      src="/image.jpg"
      alt="Description"
      className="w-full"
    />
  );
}
```

### ResponsiveImage

Multi-source image with WebP support.

```tsx
import { ResponsiveImage } from '@/components/performance/ProgressiveImage';

function OptimizedImage() {
  return (
    <ResponsiveImage
      src="/image.jpg"
      srcSet="/image-320w.webp 320w, /image-640w.webp 640w, /image-1280w.webp 1280w"
      sizes="(max-width: 768px) 100vw, 50vw"
      alt="Responsive image"
      aspectRatio="16/9"
    />
  );
}
```

### OptimizedImageGallery

Full-featured gallery with lightbox, keyboard navigation, and download.

```tsx
import { OptimizedImageGallery, GalleryImage } from '@/components/gallery/OptimizedImageGallery';

function DailyReportGallery() {
  const images: GalleryImage[] = [
    {
      id: '1',
      src: '/photos/site-1-full.jpg',
      thumbnail: '/photos/site-1-thumb.jpg',
      alt: 'Site overview',
      title: 'Foundation Complete',
      caption: 'Day 15 - Foundation work completed',
    },
    // More images...
  ];

  return (
    <OptimizedImageGallery
      images={images}
      columns={4}           // 2-5 columns
      gap="md"              // sm, md, lg
      aspectRatio="4/3"     // Any aspect ratio
      onImageClick={(image, index) => {
        console.log('Clicked:', image);
      }}
    />
  );
}
```

**Gallery Features:**
- Progressive loading for all images
- Lightbox modal with keyboard nav (←/→/Esc)
- Thumbnail navigation strip
- Download functionality
- Touch-friendly controls
- Image counter
- Full accessibility

---

## Accessibility Components

### AccessibleModal

WCAG 2.1 AA compliant modal with focus trap and keyboard navigation.

```tsx
import { AccessibleModal } from '@/components/accessibility/AccessibleModal';
import { Button } from '@/components/ui/button';

function ConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        Delete Project
      </Button>

      <AccessibleModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Confirm Deletion"
        description="This action cannot be undone."
        size="md"                          // sm, md, lg, xl, full
        hideCloseButton={false}            // Optional
        disableClickOutside={false}        // Optional
        disableEscapeKey={false}           // Optional
        footer={
          <>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p>Are you sure you want to delete this project?</p>
      </AccessibleModal>
    </>
  );
}
```

**Features:**
- Focus trap (Tab cycles within modal)
- Escape key to close
- Click outside to close
- Returns focus to trigger
- Body scroll lock
- Proper ARIA attributes
- Screen reader support

### Accessibility Hooks

```tsx
import {
  useFocusTrap,
  useAriaId,
  useAnnounce,
  useReducedMotion,
  useHighContrast,
  useEscapeKey,
  useClickOutside,
  useKeyboardListNavigation,
} from '@/hooks/useAccessibilityHelpers';

function MyComponent() {
  // Focus trap for dialogs
  const dialogRef = useFocusTrap(isOpen);

  // Stable ARIA IDs
  const titleId = useAriaId('dialog-title');

  // Screen reader announcements
  const announce = useAnnounce();
  announce('Item added to cart', 'polite');

  // Detect user preferences
  const reducedMotion = useReducedMotion();
  const highContrast = useHighContrast();

  // Keyboard handling
  useEscapeKey(() => setIsOpen(false));

  // Click outside detection
  const menuRef = useClickOutside(() => setMenuOpen(false));

  // List keyboard navigation
  const { activeIndex, handleKeyDown } = useKeyboardListNavigation(items.length, {
    orientation: 'vertical',
    loop: true,
    onSelect: (index) => handleItemSelect(index),
  });

  return <div ref={dialogRef}>{/* Content */}</div>;
}
```

---

## Mobile Features

### Biometric Authentication

Face ID, Touch ID, and Fingerprint support for iOS and Android.

```tsx
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { BiometricLoginButton } from '@/components/mobile/BiometricLoginButton';
import { BiometricSettings } from '@/components/mobile/BiometricSettings';

// In auth page
function SignInPage() {
  const handleSuccess = () => {
    console.log('Biometric auth successful');
  };

  return (
    <div>
      <form>{/* Email/password fields */}</form>

      <BiometricLoginButton
        onSuccess={handleSuccess}
        onError={(error) => console.error(error)}
      />
    </div>
  );
}

// In settings page
function UserSettingsPage() {
  return (
    <div>
      <BiometricSettings />
    </div>
  );
}

// Custom implementation
function CustomBiometric() {
  const {
    isAvailable,
    biometricType,
    authenticate,
    isBiometricLoginEnabled,
    setBiometricLoginEnabled,
    storeBiometricCredentials,
  } = useBiometricAuth();

  const handleEnableBiometric = async () => {
    const result = await authenticate('Enable biometric login');
    if (result.success) {
      await storeBiometricCredentials(email, userId);
      await setBiometricLoginEnabled(true);
    }
  };

  return (
    <button onClick={handleEnableBiometric} disabled={!isAvailable}>
      Enable {biometricType || 'Biometric'} Login
    </button>
  );
}
```

### Geofencing

Automatic time tracking when entering/exiting job sites.

```tsx
import { useGeofencing } from '@/hooks/useGeofencing';
import { GeofenceManager } from '@/components/mobile/GeofenceManager';

// Full UI component
function TimeTrackingSettings() {
  return <GeofenceManager />;
}

// Custom implementation
function CustomGeofencing() {
  const {
    regions,
    addRegion,
    removeRegion,
    startMonitoring,
    getCurrentLocation,
    getActiveRegions,
  } = useGeofencing();

  const setupJobSite = async () => {
    const location = await getCurrentLocation();
    if (location) {
      const regionId = await addRegion({
        name: 'Downtown Office Building',
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        radius: 100, // meters
        projectId: 'project-123',
      });

      console.log('Geofence created:', regionId);
    }
  };

  const startTracking = async () => {
    await startMonitoring();
    console.log('Geofence monitoring started');
  };

  return (
    <div>
      <button onClick={setupJobSite}>Add Current Location</button>
      <button onClick={startTracking}>Start Tracking</button>
    </div>
  );
}
```

---

## Touch Optimization

### TouchOptimizedButton

Buttons with proper touch targets and haptic feedback.

```tsx
import { TouchOptimizedButton } from '@/components/mobile/TouchOptimizedButton';

function MobileActions() {
  return (
    <div className="flex gap-4">
      <TouchOptimizedButton
        touchSize="sm"     // 44px min
        haptic             // Enable haptic feedback
        variant="default"
      >
        Save
      </TouchOptimizedButton>

      <TouchOptimizedButton
        touchSize="md"     // 48px
        haptic
        variant="outline"
      >
        Cancel
      </TouchOptimizedButton>

      <TouchOptimizedButton
        touchSize="lg"     // 56px
        haptic
        variant="destructive"
      >
        Delete
      </TouchOptimizedButton>
    </div>
  );
}
```

### Touch Utilities

```tsx
import {
  touchTargetClasses,
  getTouchButtonClasses,
  isTouchDevice,
  isMobileDevice,
  triggerHapticFeedback,
} from '@/lib/mobile-touch';

function MyComponent() {
  const isTouch = isTouchDevice();
  const isMobile = isMobileDevice();

  const handleClick = () => {
    triggerHapticFeedback('medium'); // light, medium, heavy
    // Handle action
  };

  return (
    <button
      className={getTouchButtonClasses('md')}
      onClick={handleClick}
    >
      Action
    </button>
  );
}
```

---

## Performance Monitoring

### Web Vitals

Monitor Core Web Vitals in production.

```tsx
// In main.tsx or App.tsx
import { initPerformanceMonitoring } from '@/components/performance/PerformanceMonitor';

// Initialize on app startup
initPerformanceMonitoring();

// Development monitor (dev only)
import { PerformanceMonitor } from '@/components/performance/PerformanceMonitor';

function App() {
  return (
    <>
      <YourApp />
      <PerformanceMonitor /> {/* Shows in dev mode only */}
    </>
  );
}
```

---

## Best Practices

### Loading States

Always show skeletons during data fetching:

```tsx
function DataTable() {
  const { data, isLoading } = useQuery('table-data', fetchData);

  if (isLoading) {
    return <TableSkeleton rows={10} columns={5} />;
  }

  return <Table data={data} />;
}
```

### Images

Use ProgressiveImage for important images, LazyImage for simple cases:

```tsx
// Hero images, featured content
<ProgressiveImage src="/hero.jpg" alt="Hero" aspectRatio="21/9" />

// List thumbnails, icons
<LazyImage src="/thumb.jpg" alt="Thumbnail" />
```

### Accessibility

1. Always provide meaningful alt text
2. Use semantic HTML
3. Include keyboard navigation
4. Test with screen readers
5. Provide focus indicators
6. Use proper ARIA attributes

```tsx
// Good
<button
  aria-label="Delete project"
  onClick={handleDelete}
>
  <TrashIcon />
</button>

// Bad
<div onClick={handleDelete}>
  <TrashIcon />
</div>
```

### Mobile

1. Use TouchOptimizedButton for primary actions
2. Enable haptic feedback for confirmations
3. Set up geofencing for outdoor work
4. Implement biometric auth for security
5. Test on actual devices

### Performance

1. Lazy load routes and heavy components
2. Use code splitting for large libraries
3. Optimize images (WebP, proper sizes)
4. Monitor Core Web Vitals
5. Keep bundle sizes under 400KB per chunk

---

## Component Showcase

Visit `/component-showcase` to see all components in action with live examples.

---

## Support

For questions or issues:
1. Check this guide
2. Review component source code (includes JSDoc)
3. Check docs/LTS_ARCHITECTURE.md
4. Review tests in `src/**/__tests__/`

---

## Version History

**v1.0 - 2025-11-13**
- Initial release
- All components production-ready
- WCAG 2.1 AA compliant
- Mobile-optimized
