# 3D Hero Testing Protocol

This document outlines the testing protocol for the BuildDesk 3D hero component implementation.

## Overview

The 3D hero component (`BuildDeskHero3D`) features:
- 3D building blocks animation (3000 instances using instanced meshes)
- Glassmorphism UI elements
- Ambient particle effects
- Mobile optimization with reduced complexity
- Accessibility features (reduced motion support, WebGL fallback)

## Installation & Activation

### To Enable the 3D Hero

1. Open `src/pages/Index.tsx`
2. Change the import from:
   ```tsx
   import Hero from "@/components/Hero";
   ```
   to:
   ```tsx
   import Hero from "@/components/Hero3D";
   ```

### To Revert to Original Hero

Simply change the import back to:
```tsx
import Hero from "@/components/Hero";
```

## Desktop Testing

Test on the following browsers at 1920x1080 resolution:

- [ ] **Chrome 120+**
  - Target: 60fps
  - Check: Smooth animation transitions
  - Check: Glass panel rendering correctly
  - Check: No console errors

- [ ] **Safari 17+**
  - Target: 60fps
  - Check: WebGL support working
  - Check: Backdrop blur effects rendering
  - Check: Canvas performance

- [ ] **Firefox 120+**
  - Target: 60fps
  - Check: Particle effects visible
  - Check: Building blocks animation smooth
  - Check: Memory usage stable

- [ ] **Edge 120+**
  - Target: 60fps
  - Check: All 3D elements loading
  - Check: No rendering artifacts

## Mobile Testing

Test on actual devices (minimum 30fps):

- [ ] **iPhone 12+**
  - Check: Reduced particle count (500 vs 2000)
  - Check: No glass accent element on mobile
  - Check: Smooth scrolling
  - Check: Touch interactions working
  - Check: Performance stable (no lag)

- [ ] **Samsung Galaxy S21+**
  - Check: WebGL initialization
  - Check: DPR set to 1-1.5 (not 2)
  - Check: Building blocks render correctly
  - Check: Responsive layout working

- [ ] **iPad Pro**
  - Check: Medium complexity rendering
  - Check: Landscape orientation working
  - Check: Touch targets adequate (44x44px)

## Field Tablet Testing (CRITICAL for BuildDesk)

These devices are commonly used by contractors on job sites:

- [ ] **Panasonic Toughbook CF-33**
  - OS: Windows 10/11
  - Check: WebGL support available
  - Check: Performance acceptable (30fps minimum)
  - Check: Outdoor visibility mode compatible
  - Check: Glove touch mode working
  - Check: High brightness mode doesn't wash out UI

- [ ] **Dell Latitude 7220 Rugged**
  - OS: Windows 10/11
  - Check: 3D rendering on integrated graphics
  - Check: Load time under 5 seconds on 3G/4G
  - Check: Canvas doesn't block UI interaction

- [ ] **Samsung Galaxy Tab Active Pro**
  - OS: Android
  - Check: WebGL ES support
  - Check: Renders correctly in sunlight
  - Check: S Pen doesn't interfere with 3D canvas

## Performance Metrics

Use Chrome DevTools Performance tab:

- [ ] **Lighthouse Audit**
  - LCP (Largest Contentful Paint): < 2.5s
  - FID (First Input Delay): < 100ms
  - CLS (Cumulative Layout Shift): < 0.1
  - Performance Score: > 90

- [ ] **Frame Rate**
  - Desktop: Maintain 60fps during animation
  - Mobile: Maintain 30fps minimum
  - Monitor: Use Chrome DevTools FPS meter

- [ ] **Bundle Size**
  - JavaScript for hero page: < 500KB
  - 3D assets total: < 2MB
  - Check: `npm run build:analyze`

- [ ] **Memory Usage**
  - Initial load: < 50MB heap
  - After 5 minutes: < 100MB heap (no leaks)
  - Check: Chrome DevTools Memory profiler

- [ ] **Network Performance**
  - 3G connection: Page loads in < 5s
  - 4G connection: Page loads in < 3s
  - Check: Chrome DevTools Network throttling

## Accessibility Testing

- [ ] **Keyboard Navigation**
  - Tab through all interactive elements
  - Focus indicators visible
  - Skip links working

- [ ] **Screen Reader (NVDA/JAWS)**
  - Hero content announced correctly
  - Button labels clear
  - No 3D canvas announced (decorative)

- [ ] **Color Contrast**
  - Text on glass panel: > 4.5:1 ratio
  - Buttons: > 4.5:1 ratio
  - Use WebAIM Contrast Checker

- [ ] **Reduced Motion**
  - Enable in OS settings
  - Verify static fallback renders
  - No animations playing
  - Content still accessible

- [ ] **ARIA Labels**
  - All buttons have accessible names
  - Links have descriptive text
  - No missing alt text

## Browser Compatibility

- [ ] **WebGL Support Detection**
  - Component detects WebGL unavailable
  - Falls back to static hero gracefully
  - No errors in console

- [ ] **Older Browsers**
  - IE11: Static fallback (no WebGL)
  - Chrome 80: Should work with degraded performance
  - Safari 13: Check for compatibility

## Regression Testing

After enabling the 3D hero, verify these don't break:

- [ ] **Page Load**
  - Homepage loads without errors
  - No infinite loading states
  - Content below hero visible

- [ ] **Scrolling**
  - Smooth scroll to sections below
  - Scroll position maintained
  - No scroll jank

- [ ] **Navigation**
  - Header navigation works
  - Footer links work
  - All internal links functional

- [ ] **Forms**
  - Demo request buttons work
  - Links to /auth functional
  - Links to /roi-calculator functional

- [ ] **Mobile Menu**
  - Hamburger menu opens
  - Navigation items clickable
  - Menu closes properly

## Load Testing

Simulate high traffic scenarios:

- [ ] **Concurrent Users**
  - Test with 100+ simultaneous users
  - Monitor server response times
  - Check for memory leaks

- [ ] **Cold Start**
  - Clear browser cache
  - Measure first load time
  - Verify progressive loading

- [ ] **Repeat Visits**
  - Check caching working
  - Subsequent loads faster
  - No re-downloading of assets

## Error Handling

Test these failure scenarios:

- [ ] **WebGL Context Loss**
  - Simulate context loss
  - Verify fallback triggers
  - No white screen of death

- [ ] **Network Timeout**
  - Slow 3G simulation
  - Component shows loading state
  - Timeout handled gracefully

- [ ] **JavaScript Disabled**
  - Basic content visible
  - Semantic HTML fallback
  - No broken layout

## SEO & Meta Tags

Verify search engine compatibility:

- [ ] **Crawlability**
  - Google Search Console: No errors
  - Hero content in HTML (not just canvas)
  - Semantic heading structure (h1, h2, etc.)

- [ ] **Meta Tags**
  - Title tag present
  - Description meta tag
  - Open Graph tags
  - Twitter Card tags

- [ ] **Structured Data**
  - Organization schema present
  - SoftwareApplication schema
  - No schema validation errors

## A/B Testing Checklist

If running an A/B test between Hero and Hero3D:

- [ ] **Setup**
  - Feature flag configured (`NEXT_PUBLIC_ENABLE_3D_HERO`)
  - Both variants load correctly
  - No flickering between variants

- [ ] **Metrics to Track**
  - Time on page
  - Scroll depth
  - Demo request conversion rate
  - Bounce rate
  - Page load time

- [ ] **Statistical Significance**
  - Minimum 1000 visitors per variant
  - Run for at least 2 weeks
  - Account for day-of-week variance

## Rollback Plan

If issues arise, follow this rollback procedure:

1. **Quick Fix (5 minutes)**
   ```tsx
   // In src/pages/Index.tsx
   import Hero from "@/components/Hero"; // Revert to original
   ```

2. **Medium Fix (30 minutes)**
   - Disable 3D on mobile only
   - Reduce particle count by 50%
   - Remove glass accent element

3. **Full Rollback (1 hour)**
   - Revert all commits related to 3D hero
   - Clear CDN cache
   - Notify team

## Sign-Off Checklist

Before deploying to production:

- [ ] All desktop browsers tested (4/4 passing)
- [ ] All mobile devices tested (3/3 passing)
- [ ] Field tablets tested (3/3 passing)
- [ ] Performance metrics met (Lighthouse > 90)
- [ ] Accessibility audit passed (WCAG 2.1 AA)
- [ ] Regression tests passed (no existing features broken)
- [ ] A/B test configured (if applicable)
- [ ] Rollback plan documented and tested
- [ ] Team trained on troubleshooting

## Contact for Issues

If you encounter issues during testing:

1. Check browser console for errors
2. Verify WebGL support: `chrome://gpu`
3. Test with reduced motion disabled
4. Compare with static Hero component
5. Document issue in GitHub with:
   - Browser/device info
   - Screenshots/videos
   - Console logs
   - Steps to reproduce

---

**Last Updated**: 2025-11-17
**Version**: 1.0
**Tested By**: [Name]
**Status**: ⚪ Not Started | 🟡 In Progress | 🟢 Complete
