# Week 4 Day 5: Production Deployment & Optimization

## Production Build Optimization

### Vite Build Configuration
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'BuildDesk',
        short_name: 'BuildDesk',
        theme_color: '#3b82f6',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    }),
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor splitting
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'tanstack': ['@tanstack/react-query'],
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false, // Disable sourcemaps in production
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});
```

### Environment Variables
```bash
# .env.production
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://api.yourdomain.com
VITE_ENVIRONMENT=production
```

## Performance Optimization

### Code Splitting Strategy
```typescript
// Lazy load routes
import { lazy, Suspense } from 'react';
import { PageLoading } from '@/components/loading/LoadingSpinner';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Projects = lazy(() => import('@/pages/Projects'));
const ProjectDetail = lazy(() => import('@/pages/ProjectDetail'));
const Settings = lazy(() => import('@/pages/Settings'));

// Route configuration
const routes = [
  {
    path: '/',
    element: (
      <Suspense fallback={<PageLoading />}>
        <Dashboard />
      </Suspense>
    ),
  },
  {
    path: '/projects',
    element: (
      <Suspense fallback={<PageLoading />}>
        <Projects />
      </Suspense>
    ),
  },
  // ... more routes
];
```

### Image Optimization
```typescript
// Image compression script
import sharp from 'sharp';
import { glob } from 'glob';

async function optimizeImages() {
  const images = await glob('public/images/**/*.{jpg,jpeg,png}');

  for (const image of images) {
    const output = image.replace(/\.(jpg|jpeg|png)$/, '.webp');

    await sharp(image)
      .resize(1920, 1920, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toFile(output);

    console.log(`Optimized: ${image} -> ${output}`);
  }
}

optimizeImages();
```

### Bundle Analysis
```bash
# Build and analyze bundle
npm run build
npx vite-bundle-visualizer

# Check bundle size
npm run build -- --mode production
ls -lh dist/assets
```

## Deployment Platforms

### Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Deploy to Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=dist
```

### Deploy to Lovable
```
1. Click the "Publish" button in Lovable
2. Your app is automatically deployed
3. Custom domain can be configured in settings
```

## Mobile App Deployment

### iOS App Store Preparation

#### 1. App Store Connect Setup
```bash
# Build production iOS app
npm run build
npx cap sync ios
npx cap open ios
```

#### 2. Required Assets
- App icon (1024x1024px)
- Launch screen images
- Screenshots (iPhone & iPad)
- App preview videos (optional)

#### 3. App Store Information
```yaml
App Name: BuildDesk
Subtitle: Construction Management
Description: |
  Professional construction project management platform.
  Manage projects, teams, and workflows efficiently.

Keywords: construction, project management, building, contractor

Primary Category: Business
Secondary Category: Productivity

Age Rating: 4+
```

#### 4. Build for Release
```
1. Open project in Xcode
2. Select "Any iOS Device" as target
3. Product > Archive
4. Validate and upload to App Store Connect
5. Submit for review
```

### Android Play Store Preparation

#### 1. Generate Signing Key
```bash
# Generate keystore
keytool -genkey -v -keystore builddesk-release.keystore \
  -alias builddesk -keyalg RSA -keysize 2048 -validity 10000
```

#### 2. Configure Gradle
```gradle
// android/app/build.gradle
android {
  signingConfigs {
    release {
      storeFile file('builddesk-release.keystore')
      storePassword System.getenv('KEYSTORE_PASSWORD')
      keyAlias 'builddesk'
      keyPassword System.getenv('KEY_PASSWORD')
    }
  }

  buildTypes {
    release {
      signingConfig signingConfigs.release
      minifyEnabled true
      proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
  }
}
```

#### 3. Build Release APK/AAB
```bash
# Build AAB (recommended for Play Store)
cd android
./gradlew bundleRelease

# Build APK (for direct distribution)
./gradlew assembleRelease
```

#### 4. Play Store Listing
```yaml
App Name: BuildDesk
Short Description: Construction project management made simple

Full Description: |
  BuildDesk is a comprehensive construction management platform
  designed for contractors, builders, and project managers.
  
  Features:
  • Project tracking and management
  • Team collaboration tools
  • Document management
  • Time tracking
  • Budget management
  • Real-time updates

Category: Business
Content Rating: Everyone

Screenshots: 
  - Phone: 2-8 screenshots
  - 7-inch tablet: 1-8 screenshots
  - 10-inch tablet: 1-8 screenshots
```

## Pre-Deployment Checklist

### Performance
- [ ] Lighthouse score > 90 on all pages
- [ ] Bundle size < 500KB (initial)
- [ ] Images optimized (WebP format)
- [ ] Code splitting implemented
- [ ] Tree shaking configured
- [ ] Console logs removed
- [ ] Source maps disabled in production
- [ ] LCP < 2.5s on 4G

### Security
- [ ] Environment variables secured
- [ ] API keys not exposed in client
- [ ] HTTPS enforced
- [ ] CSP headers configured
- [ ] XSS protection enabled
- [ ] RLS policies tested
- [ ] Authentication flow tested
- [ ] Rate limiting implemented

### SEO
- [ ] Meta tags configured
- [ ] Open Graph tags added
- [ ] Twitter Card tags added
- [ ] Sitemap generated
- [ ] Robots.txt configured
- [ ] Canonical URLs set
- [ ] Structured data added
- [ ] 404 page exists

### Mobile
- [ ] PWA manifest configured
- [ ] Service worker registered
- [ ] Icons all sizes present
- [ ] Touch targets > 44px
- [ ] Responsive on all breakpoints
- [ ] iOS tested (Safari)
- [ ] Android tested (Chrome)
- [ ] Offline functionality works

### Accessibility
- [ ] WCAG AA compliance
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast > 4.5:1
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Alt text on images
- [ ] Form labels associated

### Functionality
- [ ] All features tested
- [ ] Error handling works
- [ ] Loading states present
- [ ] Empty states exist
- [ ] Form validation works
- [ ] Authentication flow works
- [ ] Payment flow tested (if applicable)
- [ ] Email notifications work

## Monitoring & Analytics

### Error Tracking
```typescript
// Setup Sentry
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'your-sentry-dsn',
  environment: import.meta.env.MODE,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

### Analytics
```typescript
// Setup analytics
import { analytics } from '@/lib/analytics';

// Track page views
analytics.page();

// Track events
analytics.track('Project Created', {
  projectId: project.id,
  projectType: project.type,
});

// Track user properties
analytics.identify(user.id, {
  email: user.email,
  role: user.role,
});
```

## Post-Deployment Tasks

### Immediate (Day 1)
- [ ] Monitor error tracking dashboard
- [ ] Check analytics for traffic
- [ ] Test critical user flows
- [ ] Monitor server response times
- [ ] Check database performance
- [ ] Verify email deliverability
- [ ] Test payment processing (if applicable)

### Week 1
- [ ] Review error logs daily
- [ ] Monitor user feedback
- [ ] Check conversion funnels
- [ ] Analyze slow pages
- [ ] Review API usage
- [ ] Check mobile app ratings
- [ ] Respond to user reviews

### Month 1
- [ ] Analyze user behavior patterns
- [ ] Review feature usage stats
- [ ] Identify performance bottlenecks
- [ ] Plan improvements based on data
- [ ] Update documentation
- [ ] Collect user feedback
- [ ] Plan next iteration

## Rollback Plan

### Web Application
```bash
# Rollback on Vercel
vercel rollback

# Rollback on Netlify
netlify rollback

# Manual rollback
git revert <commit-hash>
git push origin main
```

### Mobile Apps
```
iOS:
1. Remove new version from sale in App Store Connect
2. Submit previous version build for review
3. Enable phased release for gradual rollout

Android:
1. Halt staged rollout in Play Console
2. Promote previous version to production
3. Monitor crash reports
```

## Definition of Done

- ✅ Production build optimized
- ✅ Bundle analyzed and optimized
- ✅ Images compressed and optimized
- ✅ Environment variables configured
- ✅ Code splitting implemented
- ✅ All checklists completed
- ✅ Deployed to production
- ✅ iOS app submitted to App Store
- ✅ Android app submitted to Play Store
- ✅ Monitoring and analytics configured
- ✅ Documentation updated
- ✅ Rollback plan prepared

## Congratulations! 🎉

You've completed the 4-week implementation plan covering:

### Week 1-2: Foundation & Core Features
- React + TypeScript setup
- UI component library (shadcn/ui)
- Routing and navigation
- State management
- API integration

### Week 3: Advanced Patterns
- Database optimization
- Query patterns and caching
- Error handling
- Performance monitoring
- Security best practices

### Week 4: Mobile & Production
- Mobile-first design
- Touch interactions
- PWA capabilities
- Native features with Capacitor
- Production deployment

### Next Steps
- Gather user feedback
- Iterate on features
- Monitor analytics
- Plan version 2.0
- Scale infrastructure as needed

**Your production-ready app is now live! 🚀**
