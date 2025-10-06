# Week 4 Day 1: Mobile-First Responsive Design

## Mobile-First Design Principles

### Design at 375-414px First
```css
/* Mobile-first approach - Start with mobile styles */
.container {
  padding: 1rem;
  width: 100%;
}

/* Then add tablet styles */
@media (min-width: 768px) {
  .container {
    padding: 2rem;
    max-width: 768px;
    margin: 0 auto;
  }
}

/* Finally desktop */
@media (min-width: 1024px) {
  .container {
    padding: 3rem;
    max-width: 1200px;
  }
}
```

### Tailwind Mobile-First Classes
```tsx
// Mobile-first utility classes
<div className="
  px-4          // Mobile: 1rem padding
  md:px-8       // Tablet: 2rem padding
  lg:px-12      // Desktop: 3rem padding
  w-full        // Mobile: Full width
  md:max-w-3xl  // Tablet: Max width
  lg:max-w-5xl  // Desktop: Larger max width
">
  <h1 className="
    text-2xl      // Mobile: 24px
    md:text-3xl   // Tablet: 30px
    lg:text-4xl   // Desktop: 36px
    font-bold
  ">
    Responsive Heading
  </h1>
</div>
```

## Touch Target Requirements

### Minimum Touch Target Size: 44×44px
```tsx
// ❌ BAD - Touch target too small
<button className="p-1">
  <X className="h-3 w-3" />
</button>

// ✅ GOOD - Minimum 44x44px
<button className="p-3 min-h-[44px] min-w-[44px]">
  <X className="h-4 w-4" />
</button>

// Button component with proper touch targets
const MobileButton = ({ children, ...props }: ButtonProps) => {
  return (
    <button
      className="
        min-h-[44px] min-w-[44px]
        px-6 py-3
        text-base font-medium
        rounded-lg
        active:scale-95
        transition-transform
      "
      {...props}
    >
      {children}
    </button>
  );
};
```

### Text Size Requirements
```tsx
// Core text must be ≥ 16px to prevent zoom on iOS
<input 
  type="text"
  className="text-base" // 16px minimum
  placeholder="Search..."
/>

// Body text
<p className="text-base leading-relaxed">
  Body text content
</p>

// Small text (use sparingly)
<span className="text-sm text-muted-foreground">
  Secondary info
</span>
```

## Single-Column Mobile Layout

### Mobile Layout Pattern
```tsx
// ❌ BAD - Multiple columns on mobile
<div className="grid grid-cols-2 gap-4">
  <Card>Content</Card>
  <Card>Content</Card>
</div>

// ✅ GOOD - Single column on mobile
<div className="
  grid 
  grid-cols-1       // Mobile: 1 column
  md:grid-cols-2    // Tablet: 2 columns
  lg:grid-cols-3    // Desktop: 3 columns
  gap-4
">
  <Card>Content</Card>
  <Card>Content</Card>
  <Card>Content</Card>
</div>

// Avoid sidebars on mobile
<div className="flex flex-col lg:flex-row gap-6">
  {/* Main content - full width on mobile */}
  <main className="flex-1">
    <h1>Main Content</h1>
  </main>
  
  {/* Sidebar - stacks below on mobile */}
  <aside className="lg:w-64 order-first lg:order-last">
    <Card>Sidebar</Card>
  </aside>
</div>
```

## Sticky Primary Actions

### Mobile Action Pattern
```tsx
// Sticky bottom action for mobile
function MobileActionBar() {
  return (
    <>
      {/* Main content with padding for sticky bar */}
      <main className="pb-20 md:pb-0">
        {/* Content */}
      </main>
      
      {/* Sticky action bar - mobile only */}
      <div className="
        fixed bottom-0 left-0 right-0
        p-4 bg-background border-t
        md:hidden
        z-50
      ">
        <Button className="w-full" size="lg">
          Add to Cart
        </Button>
      </div>
      
      {/* Desktop action - inline */}
      <div className="hidden md:block mt-6">
        <Button size="lg">
          Add to Cart
        </Button>
      </div>
    </>
  );
}
```

## Mobile-Optimized Forms

### Form Best Practices
```tsx
function MobileForm() {
  return (
    <form className="space-y-6">
      {/* Single column layout */}
      <div className="space-y-4">
        {/* Large inputs */}
        <div>
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            type="text"
            className="h-12 text-base" // Larger for mobile
            placeholder="John Doe"
          />
        </div>
        
        {/* Native input types for mobile keyboards */}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email" // Shows email keyboard
            inputMode="email"
            autoComplete="email"
            className="h-12 text-base"
            placeholder="john@example.com"
          />
        </div>
        
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel" // Shows numeric keyboard
            inputMode="tel"
            autoComplete="tel"
            className="h-12 text-base"
            placeholder="(555) 123-4567"
          />
        </div>
        
        {/* Native date picker */}
        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            className="h-12 text-base"
          />
        </div>
        
        {/* Large select dropdown */}
        <div>
          <Label htmlFor="category">Category</Label>
          <Select>
            <SelectTrigger className="h-12 text-base">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option1">Option 1</SelectItem>
              <SelectItem value="option2">Option 2</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Large submit button */}
      <Button 
        type="submit" 
        size="lg" 
        className="w-full h-12"
      >
        Submit
      </Button>
    </form>
  );
}
```

## Thumb-Friendly Navigation

### Bottom Navigation Pattern
```tsx
function MobileNavigation() {
  return (
    <nav className="
      fixed bottom-0 left-0 right-0
      bg-background border-t
      md:hidden
      z-50
    ">
      <div className="flex items-center justify-around h-16">
        <NavButton icon={Home} label="Home" />
        <NavButton icon={Search} label="Search" />
        <NavButton icon={Plus} label="Add" />
        <NavButton icon={Bell} label="Alerts" />
        <NavButton icon={User} label="Profile" />
      </div>
    </nav>
  );
}

function NavButton({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <button className="
      flex flex-col items-center justify-center
      min-w-[64px] min-h-[44px]
      space-y-1
      text-muted-foreground
      active:text-primary
      transition-colors
    ">
      <Icon className="h-5 w-5" />
      <span className="text-xs">{label}</span>
    </button>
  );
}
```

## Responsive Images

### Mobile Image Optimization
```tsx
// Responsive image with lazy loading
function ResponsiveImage({ src, alt }: { src: string; alt: string }) {
  return (
    <picture>
      {/* Mobile optimized */}
      <source
        media="(max-width: 767px)"
        srcSet={`${src}?w=400&q=80`}
      />
      {/* Tablet */}
      <source
        media="(max-width: 1023px)"
        srcSet={`${src}?w=768&q=85`}
      />
      {/* Desktop */}
      <img
        src={`${src}?w=1200&q=90`}
        alt={alt}
        loading="lazy"
        className="w-full h-auto aspect-video object-cover"
      />
    </picture>
  );
}

// Use aspect ratio to prevent layout shift
<div className="relative aspect-video bg-muted">
  <img
    src={imageSrc}
    alt="Description"
    className="absolute inset-0 w-full h-full object-cover"
    loading="lazy"
  />
</div>
```

## Mobile Breakpoints

### Tailwind Breakpoint Reference
```typescript
// Tailwind default breakpoints (mobile-first)
const breakpoints = {
  sm: '640px',   // Small tablets
  md: '768px',   // Tablets
  lg: '1024px',  // Small desktops
  xl: '1280px',  // Desktops
  '2xl': '1536px', // Large desktops
};

// Usage in components
<div className="
  // Mobile (default - no prefix)
  text-sm p-4
  
  // Small tablets (640px+)
  sm:text-base sm:p-6
  
  // Tablets (768px+)
  md:text-lg md:p-8
  
  // Desktops (1024px+)
  lg:text-xl lg:p-10
">
  Responsive Content
</div>
```

## Mobile Performance

### Reduce Layout Shift (CLS)
```tsx
// Use aspect ratio containers
<div className="aspect-video bg-muted">
  <video src={videoSrc} className="w-full h-full" />
</div>

// Reserve space for dynamic content
<div className="min-h-[200px]">
  {isLoading ? <Skeleton /> : <Content />}
</div>

// Use skeleton loaders
function ProductCardSkeleton() {
  return (
    <Card>
      <Skeleton className="aspect-square" />
      <CardContent className="space-y-2 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  );
}
```

### Mobile Testing Checklist

#### Layout Testing
- [ ] All content visible without horizontal scroll
- [ ] Text readable at 16px+ for body content
- [ ] Touch targets minimum 44×44px
- [ ] Single column layout on mobile (< 768px)
- [ ] Proper spacing between interactive elements

#### Interaction Testing
- [ ] Forms use correct input types (email, tel, etc.)
- [ ] Native date/time pickers on mobile
- [ ] Dropdowns large enough to tap
- [ ] Navigation easily reachable by thumb
- [ ] Primary actions sticky or prominent

#### Performance Testing
- [ ] Images optimized for mobile (< 200KB)
- [ ] No layout shift on load (CLS < 0.1)
- [ ] Fast paint times (LCP < 2.5s on 4G)
- [ ] Touch responses instant (< 100ms)

#### Device Testing
- [ ] Test on iPhone 13/14 (375×812)
- [ ] Test on Pixel 6 (412×915)
- [ ] Test on iPad (768×1024)
- [ ] Test in portrait and landscape
- [ ] Test with slow 3G throttling

## Definition of Done

- ✅ Mobile-first CSS/Tailwind approach used
- ✅ All touch targets ≥ 44×44px
- ✅ Core text ≥ 16px
- ✅ Single-column layout on mobile
- ✅ Forms optimized for mobile input
- ✅ Primary actions thumb-reachable
- ✅ Images responsive and optimized
- ✅ No horizontal scroll on any screen
- ✅ Tested on iOS and Android devices
- ✅ Performance budgets met on 4G

## Next Steps: Week 4 Day 2
- Touch gestures and interactions
- Swipe actions
- Pull-to-refresh
- Touch feedback patterns
