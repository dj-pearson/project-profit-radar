# BuildDesk Mobile-First Enhancement Guide

## Overview

BuildDesk has been comprehensively enhanced with a mobile-first design approach. Every component, layout, and interaction has been optimized for mobile devices while maintaining an excellent desktop experience.

## What's New

### 🎯 Core Philosophy

- **Mobile-First**: All components designed for mobile screens first, then enhanced for larger displays
- **Touch-Optimized**: Minimum 44x44px touch targets following Apple HIG and Material Design guidelines
- **Responsive**: Seamless adaptation from 320px mobile to 4K desktop displays
- **Native Feel**: Interactions that feel like native mobile apps

### 📱 Mobile-Optimized Components

#### Layout Components

**MobileLayout** - Mobile-first layout wrapper
- Safe area insets for notched devices
- Proper spacing and padding
- Optional bottom navigation spacing

**MobileContainer** - Responsive containers with size variants
**MobileSection** - Sectioned content with titles
**MobileGrid** - Responsive grid (1-4 columns)
**MobileStack** - Vertical spacing utility

#### Card Components

**MobileCard** - Touch-friendly cards with tap feedback
**MobileCardItem** - List item cards with icons and actions
**MobileStatCard** - Dashboard statistics cards
**MobileExpandableCard** - Collapsible content cards

#### Table Components

**MobileTable** - Transforms to cards on mobile, table on desktop
- Mobile: Card-based layout
- Desktop: Traditional table
- Smart column hiding
- Touch-friendly rows

**MobileList** - Simple mobile list rendering
**MobileScrollTable** - Horizontal scroll for complex tables

#### Button Components

**MobileButton** - Enhanced buttons with proper touch targets
- Small: 40px (44px min touch target)
- Medium: 48px
- Large: 56px

**MobileFAB** - Floating Action Button
**MobileButtonGroup** - Button groups with proper spacing
**MobileIconButton** - Icon-only buttons (44x44px minimum)

#### Form Components

**MobileInput** - Large input fields (48px height)
**MobileEmailInput** - Email keyboard support
**MobilePhoneInput** - Numeric keyboard for phones
**MobileNumberInput** - Number keyboard
**MobileTextarea** - Large textarea with proper sizing
**MobileFormWrapper** - Form layout wrapper

#### Navigation

**MobileBottomNav** - iOS/Android style bottom navigation
- Thumb-friendly positioning
- Active state indicators
- Icons + labels
- Auto-hides on desktop

**Enhanced Sidebar** - Touch-optimized sidebar
- 44px minimum touch targets
- Smooth animations
- Mobile-responsive width

#### Overlay Components

**MobileActionSheet** - Bottom sheet for actions
- Slides up from bottom
- Backdrop tap to close
- Native iOS/Android feel

**MobileDrawer** - Side/bottom drawer
- Position: left, right, or bottom
- Size variants: sm, md, lg, full
- Smooth animations

**MobileFilterDrawer** - Specialized filter drawer
- Reset + Apply actions
- Form-friendly layout

### 🎨 Hooks & Utilities

#### Media Query Hooks

```typescript
import { useIsMobile, useIsTablet, useIsDesktop, useBreakpoint } from '@/hooks/useMediaQuery';

const isMobile = useIsMobile(); // < 768px
const isTablet = useIsTablet(); // 768-1023px
const isDesktop = useIsDesktop(); // >= 1024px

const { isTouch, isMobileOrTablet } = useBreakpoint();
```

#### Touch Device Hooks

```typescript
import { useTouchDevice, useOrientation, useSafeArea } from '@/hooks/useTouchDevice';

const isTouch = useTouchDevice();
const orientation = useOrientation(); // 'portrait' | 'landscape'
const safeArea = useSafeArea(); // { top, right, bottom, left }
```

#### Gesture Hooks

```typescript
import { useSwipeGesture, useSwipeableItem, usePullToRefresh } from '@/hooks/useSwipeGesture';

// Swipe detection
const swipe = useSwipeGesture({
  onSwipeLeft: () => console.log('Swiped left'),
  onSwipeRight: () => console.log('Swiped right'),
  threshold: 50
});

// Swipeable list items (like iOS mail)
const { offset, handlers } = useSwipeableItem({
  onSwipeLeft: () => console.log('Delete'),
  onSwipeRight: () => console.log('Archive')
});

// Pull to refresh
const pullToRefresh = usePullToRefresh(async () => {
  await fetchData();
});
```

#### Mobile Utilities

```typescript
import {
  isMobileViewport,
  isMobileDevice,
  getTouchTargetSize,
  formatNumberMobile,
  truncateText,
  preventBodyScroll,
  vibrate,
  getMobileSpacing,
  getMobileTextSize
} from '@/lib/mobile-utils';
```

### 📐 Layout System

#### Enhanced DashboardLayout

The main `DashboardLayout` now includes:

- Mobile bottom navigation (auto-shows on mobile)
- Sticky header with proper z-index
- Flexible action buttons area
- Responsive spacing
- Safe area support

```typescript
<DashboardLayout
  title="My Page"
  showBottomNav={true}
  actions={<Button>Action</Button>}
>
  {children}
</DashboardLayout>
```

#### Alternative: MobileDashboardLayout

For pages that need more mobile-specific control:

```typescript
<MobileDashboardLayout
  title="My Page"
  showBottomNav={true}
  showTrialBanner={false}
>
  {children}
</MobileDashboardLayout>
```

#### Simple Pages: MobilePageLayout

For simple pages without the full dashboard:

```typescript
<MobilePageLayout
  title="Settings"
  subtitle="Configure your preferences"
  backButton={true}
  headerAction={<Button>Save</Button>}
>
  {content}
</MobilePageLayout>
```

### 🎬 Demo Page

Visit `/mobile-showcase` to see all mobile components in action:

- Live device detection
- Interactive component demos
- Touch gesture examples
- Responsive behavior showcase
- Form patterns
- Action sheets and drawers

### 🚀 Usage Patterns

#### Building a Mobile-First Page

```typescript
import { MobileLayout, MobileSection, MobileGrid, MobileStatCard } from '@/components/mobile';
import { useIsMobile } from '@/hooks/useMediaQuery';

export default function MyPage() {
  const isMobile = useIsMobile();

  return (
    <DashboardLayout title="Dashboard">
      <MobileLayout>
        {/* Stats Section */}
        <MobileSection title="Overview" description="Your key metrics">
          <MobileGrid cols={2}>
            <MobileStatCard title="Projects" value="12" icon={<Building />} />
            <MobileStatCard title="Revenue" value="$125K" icon={<Dollar />} />
          </MobileGrid>
        </MobileSection>

        {/* List Section */}
        <MobileSection title="Projects">
          <MobileTable
            data={projects}
            columns={columns}
            onRowClick={handleClick}
          />
        </MobileSection>
      </MobileLayout>
    </DashboardLayout>
  );
}
```

#### Mobile-Optimized Forms

```typescript
import { MobileInput, MobileButton, MobileFormWrapper } from '@/components/mobile';

function MyForm() {
  return (
    <MobileFormWrapper>
      <MobileInput label="Name" id="name" />
      <MobileInput label="Email" id="email" type="email" />
      <MobileInput label="Phone" id="phone" type="tel" />
      <MobileButton size="lg" fullWidth>Submit</MobileButton>
    </MobileFormWrapper>
  );
}
```

#### Action Sheets for Mobile

```typescript
import { MobileActionMenu } from '@/components/mobile';

const [showActions, setShowActions] = useState(false);

const actions = [
  { icon: <Edit />, label: 'Edit', onClick: () => handleEdit() },
  { icon: <Share />, label: 'Share', onClick: () => handleShare() },
  { icon: <Trash />, label: 'Delete', onClick: () => handleDelete(), variant: 'destructive' }
];

<MobileActionMenu
  isOpen={showActions}
  onClose={() => setShowActions(false)}
  actions={actions}
  title="Project Actions"
/>
```

### 🎨 Responsive Design Tokens

#### Spacing (Mobile-First)
- `p-4 md:p-6` - Padding
- `gap-3 md:gap-4` - Gaps
- `space-y-4 md:space-y-6` - Vertical spacing

#### Text Sizes (Mobile-First)
- `text-base md:text-lg` - Body text
- `text-lg md:text-xl` - Headings
- `text-xl md:text-2xl` - Large headings

#### Touch Targets
- Minimum: 44x44px
- Comfortable: 48x48px
- Spacious: 56x56px

### 🔧 Migration Guide

#### Update Existing Pages

1. **Import mobile components**:
```typescript
import { MobileLayout, MobileGrid, MobileCard } from '@/components/mobile';
import { useIsMobile } from '@/hooks/useMediaQuery';
```

2. **Wrap content in mobile layouts**:
```typescript
// Before
<div className="grid grid-cols-3 gap-4">
  {items.map(item => <Card>{item}</Card>)}
</div>

// After
<MobileGrid cols={3}>
  {items.map(item => <MobileCard>{item}</MobileCard>)}
</MobileGrid>
```

3. **Replace tables**:
```typescript
// Before
<table>...</table>

// After
<MobileTable data={data} columns={columns} />
```

4. **Enhance buttons**:
```typescript
// Before
<Button size="sm">Action</Button>

// After
<MobileButton size="md">Action</MobileButton>
```

### 📱 Mobile Testing Checklist

- [ ] Test on actual mobile devices (iOS & Android)
- [ ] Test touch interactions (tap, swipe, long press)
- [ ] Test in portrait and landscape orientations
- [ ] Test with various font sizes (accessibility)
- [ ] Test with notched devices (safe areas)
- [ ] Test bottom navigation doesn't overlap content
- [ ] Test forms on mobile keyboards
- [ ] Test modals and overlays on mobile
- [ ] Test loading states on slow connections
- [ ] Test offline functionality

### 🌐 Browser Support

- iOS Safari 12+
- Chrome Mobile 80+
- Android WebView 80+
- Samsung Internet 10+
- Desktop browsers (Chrome, Firefox, Safari, Edge)

### 🎯 Performance

- Mobile components use `useMediaQuery` with efficient event listeners
- No layout shifts during responsive changes
- Optimized re-renders with proper memoization
- Touch gestures use passive event listeners
- Minimal bundle size impact (tree-shakeable exports)

### 📚 Best Practices

1. **Always use mobile-first breakpoints**: Start with mobile, enhance for desktop
2. **Test on real devices**: Emulators don't show real touch behavior
3. **Respect safe areas**: Use safe-area-inset for notched devices
4. **44px minimum touch targets**: Never go below Apple's recommendation
5. **Use native patterns**: Bottom sheets, action sheets, drawers
6. **Optimize for thumbs**: Place important actions at bottom on mobile
7. **Prevent zoom**: Use proper viewport meta tags
8. **Test with large text**: Support accessibility settings

### 🔗 Related Documentation

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design Touch Targets](https://material.io/design/usability/accessibility.html)

### 🆘 Support

For issues or questions about mobile features:
1. Check the `/mobile-showcase` demo page
2. Review component TypeScript definitions
3. Check browser console for warnings
4. Test on multiple devices

---

**BuildDesk** - Construction Management Software, Mobile-First
