# Bundle Optimization Guide

## Quick Start

```bash
# 1. Build the project
npm run build

# 2. Run bundle analysis
node scripts/analyze-bundle.js

# 3. View visual bundle analyzer (open in browser)
open dist/stats.html
```

## Understanding the Bundle

### What is Bundle Size?

Your bundle is all the JavaScript, CSS, and assets that need to be downloaded for your app to work. Smaller bundles = faster load times.

**Target Sizes**:
- **Initial Bundle**: <1MB (gzipped)
- **Total Bundle**: <3MB (uncompressed)
- **Individual Chunks**: <500KB each

### Current Build Configuration

```typescript
// vite.config.ts - Manual Chunking Strategy

manualChunks: {
  // Core framework (React, React Router)
  'react-core': ['react', 'react-dom'],
  'react-router': ['react-router-dom'],
  
  // UI framework (Radix UI components)
  'ui-core': [...],
  'ui-extended': [...],
  
  // Utilities
  'utils': ['clsx', 'tailwind-merge', 'class-variance-authority'],
  
  // Feature chunks
  'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
  'auth': ['@supabase/supabase-js'],
  'charts': ['recharts'],
  'documents': ['jspdf', 'jspdf-autotable', 'xlsx'],
  'query': ['@tanstack/react-query'],
}
```

## Common Issues & Solutions

### ❌ Issue: Chunk > 500KB

**Symptoms**:
```
❌ documents-a1b2c3.js    782 KB
```

**Solution 1: Lazy Load the Feature**
```tsx
// Before (bundled with main app)
import { PDFGenerator } from '@/components/pdf/PDFGenerator';

// After (loaded only when needed)
const PDFGenerator = lazy(() => import('@/components/pdf/PDFGenerator'));

// Usage
<Suspense fallback={<LoadingSpinner />}>
  <PDFGenerator />
</Suspense>
```

**Solution 2: Dynamic Import in Event Handler**
```tsx
const generatePDF = async () => {
  // Only load when user clicks "Generate PDF"
  const { generateDocument } = await import('@/lib/pdf-generator');
  await generateDocument(data);
};
```

### ❌ Issue: Duplicate Dependencies

**Symptoms**:
```
Bundle contains multiple versions of 'date-fns'
```

**Solution: Check package-lock.json**
```bash
# Find duplicates
npm ls date-fns

# Deduplicate
npm dedupe
```

### ❌ Issue: Unused Dependencies

**Symptoms**:
```
'lodash' is in bundle but never imported
```

**Solution: Remove Unused Packages**
```bash
# Find unused deps
npx depcheck

# Remove them
npm uninstall lodash
```

## Optimization Strategies

### 1. Lazy Load Heavy Features

**Candidates for Lazy Loading**:
- PDF generation (`jspdf`)
- Excel export (`xlsx`)
- Charts (`recharts`)
- OCR (`tesseract.js`)
- 3D rendering (`three`, `@react-three/*`)
- Calendar/date pickers
- Rich text editors
- File upload widgets

**Implementation Pattern**:
```tsx
// Create a lazy-loaded wrapper
// src/components/lazy/LazyPDFGenerator.tsx
import { lazy, Suspense } from 'react';

const PDFGenerator = lazy(() => import('../pdf/PDFGenerator'));

export const LazyPDFGenerator = (props) => (
  <Suspense fallback={<div>Loading PDF generator...</div>}>
    <PDFGenerator {...props} />
  </Suspense>
);
```

### 2. Split Vendor Bundles

**When to Split**:
- A package is > 100KB
- The package is used in multiple routes
- The package changes infrequently (good for caching)

**How to Split**:
```typescript
// vite.config.ts
manualChunks: {
  // Split large vendor
  'vendor-charts': ['recharts', 'recharts-scale'],
  
  // Split by feature
  'vendor-forms': ['react-hook-form', 'zod'],
}
```

### 3. Tree Shaking

**Ensure Imports Are Tree-Shakeable**:
```tsx
// ❌ Bad (imports entire library)
import _ from 'lodash';
import * as dateFns from 'date-fns';

// ✅ Good (only imports what you use)
import { debounce } from 'lodash-es';
import { format, parseISO } from 'date-fns';
```

**Check Tree Shaking**:
```bash
# Build and check for unused code
npm run build

# Search for "unused" in bundle analyzer
# Look for yellow/orange sections in treemap
```

### 4. Replace Heavy Packages

**Common Heavy Packages & Alternatives**:

| Heavy Package | Size | Lighter Alternative | Size |
|--------------|------|---------------------|------|
| `moment` | 288KB | `date-fns` | 78KB |
| `lodash` | 544KB | `lodash-es` (tree-shakeable) | ~20KB (only what you use) |
| `axios` | 14KB | `fetch` (native) | 0KB |
| `recharts` | 481KB | `chart.js` | 259KB |

**Example Replacement**:
```bash
# Replace moment with date-fns
npm uninstall moment
npm install date-fns
```

```tsx
// Before
import moment from 'moment';
const formatted = moment(date).format('YYYY-MM-DD');

// After
import { format } from 'date-fns';
const formatted = format(date, 'yyyy-MM-dd');
```

## Advanced Techniques

### 1. Route-Based Code Splitting

**Already Implemented** ✅ (78 lazy routes)

```tsx
// Route with lazy loading
{
  path: '/projects',
  element: <LazyProjects />
}
```

**Optimization**: Prefetch on hover
```tsx
import { prefetchRoute } from '@/lib/route-prefetch';

<Link 
  to="/projects"
  onMouseEnter={() => prefetchRoute('/projects')}
>
  Projects
</Link>
```

### 2. Component-Level Code Splitting

```tsx
// Split heavy components
const HeavyChart = lazy(() => import('./HeavyChart'));
const HeavyDataGrid = lazy(() => import('./HeavyDataGrid'));

// Render conditionally
{showChart && (
  <Suspense fallback={<ChartSkeleton />}>
    <HeavyChart />
  </Suspense>
)}
```

### 3. Dynamic Imports for User Interactions

```tsx
// Only load when user interacts
const handleExport = async (format: 'pdf' | 'excel') => {
  if (format === 'pdf') {
    const { exportToPDF } = await import('@/lib/pdf-export');
    await exportToPDF(data);
  } else {
    const { exportToExcel } = await import('@/lib/excel-export');
    await exportToExcel(data);
  }
};
```

## Measuring Impact

### Before Optimization
```bash
npm run build
node scripts/analyze-bundle.js
```

**Record**:
- Total bundle size
- Largest chunks
- Number of chunks

### After Optimization
```bash
# Re-run analysis
npm run build
node scripts/analyze-bundle.js
```

**Compare**:
- Bundle size reduction (%)
- Chunk size reduction (%)
- Number of chunks (should increase with proper splitting)

### Real-World Testing

```bash
# Test on slow network
npx lighthouse https://localhost:8080 --throttling.cpuSlowdownMultiplier=4

# Check metrics
# - Time to Interactive (TTI)
# - First Contentful Paint (FCP)
# - Largest Contentful Paint (LCP)
```

## Maintenance

### Regular Audits

**Monthly**:
- [ ] Run bundle analyzer
- [ ] Check for new large dependencies
- [ ] Review lazy loading coverage

**Quarterly**:
- [ ] Audit and update dependencies
- [ ] Review and prune unused code
- [ ] Check for duplicate packages

**After Adding Dependencies**:
```bash
# Check impact immediately
npm run build
node scripts/analyze-bundle.js

# If bundle grows significantly, consider lazy loading
```

## Troubleshooting

### Bundle Size Suddenly Increased

1. **Check Recent Commits**
   ```bash
   git log --oneline -10
   git diff HEAD~1 package.json
   ```

2. **Find the Culprit**
   ```bash
   npm ls | grep <new-package>
   npx webpack-bundle-analyzer dist/stats.json
   ```

3. **Take Action**
   - Lazy load the feature
   - Find lighter alternative
   - Remove if not critical

### Lazy Loading Not Working

**Check**:
- Suspense boundary exists
- Error boundary wraps lazy component
- Network tab shows chunk loading
- Console has no errors

**Debug**:
```tsx
const LazyComponent = lazy(() => 
  import('./Component').catch(err => {
    console.error('Failed to load component:', err);
    return { default: () => <div>Failed to load</div> };
  })
);
```

## Resources

- [Vite Code Splitting Docs](https://vitejs.dev/guide/build.html#chunking-strategy)
- [React.lazy Documentation](https://react.dev/reference/react/lazy)
- [Bundle Phobia](https://bundlephobia.com/) - Check package sizes before installing
- [Import Cost VSCode Extension](https://marketplace.visualstudio.com/items?itemName=wix.vscode-import-cost) - See import sizes in editor

## Checklist

### Bundle Optimization Complete When:
- [ ] Total bundle < 3MB uncompressed
- [ ] All chunks < 500KB
- [ ] Heavy features lazy loaded
- [ ] No duplicate dependencies
- [ ] Tree shaking verified
- [ ] Bundle analyzer reviewed
- [ ] Lighthouse score > 90
