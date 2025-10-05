# Week 1 Performance Optimizations

## ✅ Completed Tasks

### 1. Real Metrics Implementation (Day 1) ✅
**Status**: Complete  
**Impact**: High - Now tracking real Core Web Vitals

**Changes Made**:
- ✅ Installed `web-vitals` library (official Google package)
- ✅ Created `useWebVitals` hook in `src/hooks/useWebVitals.ts`
- ✅ Built `RealTimePerformanceMonitor` component for live metrics
- ✅ Integrated automatic Google Analytics reporting
- ✅ Updated `main.tsx` to initialize Web Vitals on app load
- ✅ Added `vite-plugin-image-optimizer` for build-time compression

**Metrics Now Tracked**:
- **LCP** (Largest Contentful Paint) - Target: <2.5s
- **CLS** (Cumulative Layout Shift) - Target: <0.1
- **INP** (Interaction to Next Paint) - Target: <200ms
- **FCP** (First Contentful Paint) - Target: <1.8s
- **TTFB** (Time to First Byte) - Target: <600ms

**Testing**: 
```bash
# View metrics in browser console
# Open DevTools → Console → Look for "[Web Vitals]" logs
```

**Next Steps**:
- [ ] Add `RealTimePerformanceMonitor` to dev-only admin panel
- [ ] Set up alerts for poor Web Vitals in production
- [ ] Create dashboard for historical performance data

---

## 🔄 In Progress Tasks

### 2. Image Optimization (Days 2-3)
**Status**: Investigation complete, implementation needed  
**Priority**: HIGH - Images are largest payload

**Findings**:
1. **No local image files detected** in `public/` or `src/assets/`
2. **External images** mostly from Supabase Storage:
   - `BuildDeskLogo.png` - Main logo
   - Various construction photos in storage buckets
3. **Placeholder references** in code (don't exist yet):
   - `/logos/*.png` (6 client logos)
   - `/images/construction-*.jpg` (progress photos)
   - `/placeholder-*.jpg` (various UI placeholders)

**Action Plan**:

#### A. Optimize External Supabase Images
```bash
# 1. Download BuildDeskLogo.png from Supabase
# 2. Compress and convert to WebP
# 3. Upload optimized version back to Supabase
# 4. Use Supabase image transformations for responsive sizes
```

**Supabase Image Transformation API**:
```typescript
// Before (no optimization)
const url = 'https://...supabase.co/storage/v1/object/public/site-assets/BuildDeskLogo.png';

// After (with optimization)
const url = 'https://...supabase.co/storage/v1/object/public/site-assets/BuildDeskLogo.png?width=400&quality=80';
```

#### B. Create Responsive Image Component
```tsx
// src/components/ui/optimized-supabase-image.tsx
interface Props {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
}

export const OptimizedSupabaseImage = ({ src, alt, sizes, className }: Props) => {
  const baseUrl = src.split('?')[0];
  
  return (
    <img
      src={`${baseUrl}?quality=80`}
      srcSet={`
        ${baseUrl}?width=400&quality=80 400w,
        ${baseUrl}?width=800&quality=80 800w,
        ${baseUrl}?width=1200&quality=80 1200w
      `}
      sizes={sizes || '100vw'}
      alt={alt}
      loading="lazy"
      className={className}
    />
  );
};
```

#### C. Generate Missing Placeholder Images
Use AI image generation for:
- Client logos (generic construction company logos)
- Construction progress photos
- UI placeholders

#### D. Implement Lazy Loading Globally
Update all image references to use `loading="lazy"`:
```tsx
// Find and replace pattern
<img src={...} alt={...} />
// With
<img src={...} alt={...} loading="lazy" />
```

**Expected Impact**:
- 📉 60% reduction in image payload
- ⚡ 1-2s faster LCP on slow connections
- 💾 Reduced bandwidth costs

**To-Do Checklist**:
- [ ] Create `OptimizedSupabaseImage` component
- [ ] Replace logo references with optimized component
- [ ] Add Supabase URL transform helper function
- [ ] Generate AI placeholder images for missing assets
- [ ] Update all `<img>` tags to include `loading="lazy"`
- [ ] Test on 4G throttled connection

---

### 3. Font Optimization (Day 3)
**Status**: Partially complete, needs refinement  
**Priority**: MEDIUM - Fonts affect FCP

**Current State** (from `index.html`):
```html
<!-- Preconnect -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Preload -->
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">

<!-- Async Load -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
```

**Issues**:
- ❌ Still loading from Google Fonts (network roundtrip)
- ❌ Loading 4 font weights (400, 500, 600, 700)
- ⚠️ Potentially only need 400 and 600

**Optimization Plan**:

#### Option A: Self-Host Inter (RECOMMENDED)
```bash
# 1. Download Inter font files
npx google-fonts-download "Inter:400,600" -o public/fonts

# 2. Update index.html
<link rel="preload" href="/fonts/inter-v12-latin-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/inter-v12-latin-600.woff2" as="font" type="font/woff2" crossorigin>

# 3. Add @font-face in index.css
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/inter-v12-latin-400.woff2') format('woff2');
}
```

**Benefits**:
- ⚡ Eliminates DNS lookup and connection to Google
- 🔒 Better privacy (no Google tracking)
- 📦 Smaller payload (only 2 weights instead of 4)
- ⏱️ ~200ms faster font load

#### Option B: Variable Font (ALTERNATIVE)
```html
<!-- Single file for all weights -->
<link rel="preload" href="/fonts/Inter-Variable.woff2" as="font" type="font/woff2" crossorigin>
```

**Expected Impact**:
- 📉 50% reduction in font load time
- ⚡ 100-300ms faster FCP
- 💾 Reduced DNS lookups

**To-Do Checklist**:
- [ ] Audit font weight usage across app (find actual weights used)
- [ ] Download and self-host Inter (400, 600 only)
- [ ] Remove Google Fonts from `index.html`
- [ ] Add `@font-face` declarations to `index.css`
- [ ] Test font rendering on all pages
- [ ] Verify `font-display: swap` prevents FOIT

---

### 4. Bundle Analysis (Days 3-4)
**Status**: Analyzer configured, audit needed  
**Priority**: HIGH - Bundle size directly impacts load time

**Current Configuration**:
```bash
# Build with bundle analyzer
npm run build

# View results
open dist/stats.html
```

**Known Issues**:
- ⚠️ 118 production dependencies (audit needed)
- ⚠️ 497 components with state (high complexity)
- ⚠️ Manual chunking configured but not verified

**Action Plan**:

#### A. Run Bundle Analysis
```bash
npm run build
# Open dist/stats.html in browser
# Take screenshot and document findings
```

**What to Look For**:
1. **Chunks > 500KB** (should be split further)
2. **Duplicate packages** (should be deduplicated)
3. **Unused code** (should be tree-shaken)
4. **Heavy dependencies** (consider alternatives)

#### B. Dependency Audit
```bash
# List all dependencies with sizes
npx npm-why <package-name>

# Check for unused dependencies
npx depcheck
```

**Known Heavy Packages** (likely culprits):
- `@radix-ui/*` - UI components (consider lazy loading)
- `recharts` - Charts library (lazy load charts)
- `jspdf` / `jspdf-autotable` - PDF generation (lazy load)
- `xlsx` - Excel export (lazy load)
- `tesseract.js` - OCR (lazy load)
- `three` / `@react-three/*` - 3D rendering (lazy load if used)

#### C. Optimization Strategies

**1. Lazy Load Heavy Features**:
```tsx
// Before
import { PDFGenerator } from '@/components/pdf/PDFGenerator';

// After
const PDFGenerator = lazy(() => import('@/components/pdf/PDFGenerator'));
```

**2. Dynamic Imports for Large Libraries**:
```tsx
// Only load when needed
const generatePDF = async () => {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF();
  // ...
};
```

**3. Remove Unused Dependencies**:
```bash
# Check and remove
npm uninstall <unused-package>
```

**Expected Impact**:
- 📉 30-40% reduction in main bundle size
- ⚡ 500ms-1s faster initial load
- 💾 Reduced bandwidth usage

**To-Do Checklist**:
- [ ] Run bundle analyzer and document results
- [ ] Create list of packages > 100KB
- [ ] Identify rarely-used heavy features for lazy loading
- [ ] Run `depcheck` to find unused dependencies
- [ ] Implement lazy loading for PDF, Excel, OCR features
- [ ] Re-run bundle analysis to measure improvement
- [ ] Update manual chunks in `vite.config.ts` if needed

---

## ⏳ Pending Tasks (Days 5-7)

### 5. Component Optimization Audit
**Priority**: MEDIUM  
**Estimated Time**: 2-3 days

**Action Items**:
- [ ] Audit top 20 largest components for unnecessary re-renders
- [ ] Add `React.memo` to pure components
- [ ] Wrap callbacks in `useCallback` where appropriate
- [ ] Wrap expensive computations in `useMemo`
- [ ] Test before/after with React DevTools Profiler

### 6. Database Query Performance Baseline
**Priority**: MEDIUM (prep for Week 2)  
**Estimated Time**: 1 day

**Action Items**:
- [ ] Enable Supabase query logging
- [ ] Document all query patterns in the app
- [ ] Measure average query response times
- [ ] Identify N+1 query patterns
- [ ] Create baseline metrics for Week 2 optimization

---

## Week 1 Success Metrics

### Targets
- ✅ Web Vitals monitoring live
- 🔄 Bundle size < 3MB (uncompressed)
- 🔄 Image payload < 2MB (first load)
- 🔄 Font load time < 100ms
- 🔄 Lighthouse score > 85 (mobile)

### Measurements
**Before** (Baseline):
- Bundle: TBD (run `npm run build` and check)
- Images: TBD (check Network tab on homepage)
- Fonts: TBD (check Network tab, font section)
- Lighthouse: TBD (run audit)

**After** (Target for Day 7):
- Bundle: < 3MB uncompressed
- Images: < 2MB total
- Fonts: < 100ms TTFB
- Lighthouse: > 85 score

---

## Daily Standup Format

**Day X Update**:
- ✅ **Completed**: [List tasks]
- 🔄 **In Progress**: [Current task]
- ⏳ **Next**: [Next task]
- 🚧 **Blockers**: [Any issues]
- 📊 **Metrics**: [Performance improvements]

---

## Tools & Commands Reference

### Build & Analyze
```bash
npm run build              # Production build
npm run build:analyze      # Build with bundle analyzer
```

### Performance Testing
```bash
# Lighthouse CLI
npx lighthouse https://localhost:8080 --view

# Check bundle size
du -sh dist/

# List largest files in bundle
find dist -type f -exec du -h {} + | sort -rh | head -20
```

### Image Optimization
```bash
# Convert PNG to WebP (if needed locally)
npx @squoosh/cli --webp auto *.png

# Compress JPEG
npx @squoosh/cli --mozjpeg auto *.jpg
```

### Font Tools
```bash
# Download Google Fonts for self-hosting
npx google-fonts-download "Inter:400,600" -o public/fonts

# Check font file sizes
ls -lh public/fonts/
```

---

## Notes & Learnings

### Performance Best Practices Applied
1. ✅ **Measure First** - Using real Web Vitals data, not assumptions
2. ✅ **Low-Hanging Fruit** - Starting with images, fonts, bundle
3. ⏳ **Progressive Enhancement** - Lazy load non-critical features
4. ⏳ **Cache Aggressively** - Long cache times for static assets
5. ⏳ **Network Aware** - Use Supabase transformations for images

### Common Pitfalls to Avoid
- ❌ Don't optimize without measuring first
- ❌ Don't lazy load above-the-fold content
- ❌ Don't remove features to hit metrics
- ❌ Don't sacrifice UX for performance scores
- ✅ DO make data-driven decisions
- ✅ DO test on real devices with slow networks
