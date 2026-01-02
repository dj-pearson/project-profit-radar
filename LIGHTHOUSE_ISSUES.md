# Lighthouse Loading Issues Analysis

**Date:** 2026-01-02
**Analyzed by:** Claude
**Branch:** claude/lighthouse-loading-issues-u6BQu

## Executive Summary

Analysis of the BuildDesk application identified several performance issues affecting initial page load times, particularly on the landing page (Index). While lazy loading is implemented, several optimizations can improve Core Web Vitals scores.

## Issues Identified

### 1. Non-functional Route Preloading (HIGH PRIORITY)

**Location:** `src/utils/lazyRoutes.tsx:267-272`

**Issue:** The `preloadHighPriorityRoutes()` function is defined but does nothing - it simply returns immediately. This means high-priority routes (Dashboard, Auth, Projects) are not being preloaded, causing unnecessary delays when users navigate.

```typescript
// Current implementation - does nothing
export const preloadHighPriorityRoutes = () => {
  return; // No-op
};
```

**Impact:** Users experience delayed navigation to critical routes like Dashboard and Auth.

**Fix:** Implement actual preloading by calling the lazy component factories.

---

### 2. Large Chunk Sizes

**Location:** Build output

**Issue:** Several chunks exceed the 400KB warning threshold:

| Chunk | Size | Content |
|-------|------|---------|
| chunk-BEINRz5f.js | 1.3MB | Three.js (3D rendering) |
| chunk-DL3tZ0EZ.js | 801KB | Unknown heavy chunk |
| chunk-CnXBtpnS.js | 735KB | Unknown heavy chunk |
| chunk-CH1ue-_R.js | 416KB | UI components |
| chunk-CJgQ6Sba.js | 392KB | Unknown |

**Impact:** While code-split, these large chunks may still be requested on initial page load if any import chain references them.

---

### 3. 3D Component on Landing Page

**Location:** `src/components/Hero.tsx:8`

**Issue:** The Hero component on the landing page loads the PremiumBlueprint3D component (Three.js) via lazy loading but still triggers the import on all devices. On mobile, this loads ~1.3MB of Three.js code even though a fallback is eventually shown.

```typescript
const PremiumBlueprint3D = lazy(() => import("@/components/3d/PremiumBlueprint3D"));
```

**Impact:** Mobile users download large 3D libraries unnecessarily.

**Fix:** Conditionally import 3D component only on desktop/large screens.

---

### 4. Synchronous Above-the-Fold Imports

**Location:** `src/pages/Index.tsx:1-14`

**Issue:** Multiple components are imported synchronously on the Index page:
- Header
- Hero
- SocialProof
- ProblemSolution
- FinancialIntelligenceShowcase
- ModernSection
- Various SEO components

While some are lazy-loaded, the core above-the-fold components add to the initial bundle.

---

### 5. CSS Bundle Size

**Location:** `dist/assets/index-9kEoPf0h.css`

**Issue:** Main CSS bundle is 183KB (28KB gzipped). While not critical, there may be opportunities to:
- Extract critical CSS
- Defer non-critical styles

---

## Recommendations

### Quick Wins (Implemented in this PR)

1. **Implement route preloading** - Actual preloading of high-priority routes
2. **Conditional 3D loading** - Only load Three.js on desktop devices
3. **Defer more Index page components** - Lazy load additional below-fold components

### Future Considerations

1. **Analyze large chunks** - Investigate what's in the 800KB+ chunks
2. **Critical CSS extraction** - Inline critical CSS for faster FCP
3. **Resource hints** - Add `<link rel="preload">` for critical assets
4. **Service Worker optimization** - Pre-cache critical routes

---

## Metrics (Pre-fix Baseline)

| Metric | Value |
|--------|-------|
| Main JS Entry | 122KB |
| Main CSS | 183KB (28KB gzipped) |
| Index Page Chunk | 28KB |
| Three.js Chunk | 1.3MB |
| Total Initial Bundle (estimated) | ~500KB gzipped |

---

## Files Modified

- `src/utils/lazyRoutes.tsx` - Implement actual preloading
- `src/components/Hero.tsx` - Conditional 3D loading
- `src/pages/Index.tsx` - Additional lazy loading optimizations
