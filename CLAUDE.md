# BuildDesk - Construction Management Platform

## Overview

BuildDesk is a comprehensive construction management platform designed for small to medium-sized construction businesses. It's a B2B SaaS platform that provides real-time project management, financial tracking, and collaborative tools specifically tailored for the construction industry.

### Key Business Context
- **Target Market**: SMB construction companies ($199-799/month segment)
- **Platform Status**: ~95% complete for target SMB market (Phase 4 complete, Phase 5 in progress)
- **Business Model**: SaaS subscription platform with Stripe integration
- **Current Pricing**: $350/month unlimited users
- **Differentiator**: Real-time job costing and financial control without enterprise complexity

---

## Technology Stack

### Frontend
- **Framework**: React 19.1 with TypeScript 5.9.2
- **Build Tool**: Vite 5.4.1 with advanced optimization
- **Styling**: Tailwind CSS 3.4.11 with shadcn/ui components
- **State Management**: React Context + TanStack Query 5.56.2
- **Routing**: React Router DOM 6.26.2
- **UI Components**: Radix UI primitives with custom component system
- **Error Tracking**: Sentry 10.25.0
- **Analytics**: PostHog 1.284.0 + Web Vitals 5.1.0

### Mobile & Native
- **Mobile Strategy**: Multi-platform approach
  - **Capacitor 7.4.4**: iOS & Android native apps
  - **Expo 54.0.15**: React Native integration (in development)
  - **React Native 0.81.4**: Native UI components
- **Mobile Features**:
  - Camera integration (@capacitor/camera)
  - Geolocation & GPS tracking (@capacitor/geolocation)
  - Local notifications (@capacitor/local-notifications)
  - Offline storage (@capacitor/preferences)
  - Push notifications (@capacitor/push-notifications)

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with SSO support
- **Edge Functions**: Supabase Edge Functions (Deno runtime)
- **File Storage**: Supabase Storage
- **Real-time**: Supabase Realtime with WebSocket

### Third-Party Integrations
- **Payments**: Stripe (subscriptions, invoicing, webhooks)
- **Accounting**: QuickBooks Online (2-way sync)
- **Calendar**: Google Calendar & Outlook integration
- **PDF Generation**: jsPDF 3.0.1 with autotable
- **Excel Export**: xlsx 0.18.5
- **OCR**: Tesseract.js 6.0.1
- **Charts**: Recharts 2.12.7
- **3D Rendering**: Three.js 0.158.0 with @react-three/fiber
- **MCP Integration**: Puppeteer, Upstash Context7, Supabase MCP

### Testing & Quality
- **Unit Testing**: Vitest 4.0.8 with Happy DOM
- **E2E Testing**: Playwright 1.56.1 (Chromium, Firefox, WebKit, Mobile)
- **Test Coverage**: V8 coverage provider with 60% thresholds
- **UI Testing**: Testing Library (React, DOM, User Event)
- **Linting**: ESLint 9.9.0 with React hooks & TypeScript plugins
- **Performance**: Lighthouse CI 0.15.1 with automated audits

### Deployment
- **Primary**: Cloudflare Pages
- **Package Manager**: npm 10.9.2 (explicitly configured)
- **Node Version**: 18+
- **Build Output**: dist/ folder
- **CDN**: Cloudflare global edge network

---

## Project Structure

```
/home/user/project-profit-radar/
├── src/
│   ├── components/              # 115+ domain-specific component directories
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── financial/           # Financial management
│   │   ├── dashboard/           # Dashboard components
│   │   ├── mobile/              # Mobile-specific components
│   │   ├── native/              # React Native components
│   │   ├── admin/               # Admin interface
│   │   ├── crm/                 # CRM features
│   │   ├── analytics/           # Analytics & BI
│   │   ├── ai/                  # AI-powered features
│   │   ├── gps/                 # GPS & geofencing
│   │   ├── time-tracking/       # Time & attendance
│   │   ├── estimates/           # Estimating tools
│   │   ├── scheduling/          # Project scheduling
│   │   ├── documents/           # Document management
│   │   ├── safety/              # Safety compliance
│   │   ├── client-portal/       # Client collaboration
│   │   ├── compliance/          # Regulatory compliance
│   │   ├── seo/                 # SEO components
│   │   ├── testing/             # Test utilities
│   │   └── [90+ more domains]   # See full list below
│   ├── pages/                   # Route pages (260+ pages)
│   │   ├── admin/               # Admin pages
│   │   ├── features/            # Feature showcase pages
│   │   ├── settings/            # Settings pages
│   │   ├── tools/               # Tool pages
│   │   └── resources/           # Resource pages
│   ├── contexts/                # React contexts
│   │   ├── AuthContext.tsx      # Authentication
│   │   └── ThemeContext.tsx     # Theme management
│   ├── hooks/                   # Custom React hooks
│   ├── integrations/            # Third-party integrations
│   │   └── supabase/            # Supabase client, types, hooks
│   ├── lib/                     # Core utilities
│   │   ├── security/            # Security utilities (sanitization, validation)
│   │   ├── validation/          # Form validation schemas
│   │   ├── __tests__/           # Unit tests
│   │   └── [fallback files]    # Web fallbacks for native modules
│   ├── mobile/                  # Mobile-specific code
│   │   ├── contexts/            # Mobile contexts
│   │   ├── services/            # Mobile services
│   │   └── utils/               # Mobile utilities
│   ├── services/                # Business logic services
│   │   ├── ai/                  # AI services
│   │   └── analytics/           # Analytics services
│   ├── routes/                  # Route definitions
│   ├── types/                   # TypeScript type definitions
│   ├── utils/                   # Additional utilities
│   ├── config/                  # Configuration files
│   ├── content/                 # Static content (blog, etc.)
│   ├── data/                    # Static data
│   ├── assets/                  # Images, icons, etc.
│   ├── styles/                  # Global styles
│   ├── templates/               # Email templates
│   └── test/                    # Test setup files
├── supabase/
│   ├── functions/               # 154+ Edge functions
│   │   ├── stripe-webhooks/     # Payment processing
│   │   ├── ai-*/                # AI-powered features
│   │   ├── analytics-*/         # Analytics APIs
│   │   ├── blog-*/              # Blog automation
│   │   └── [140+ more]          # API endpoints
│   ├── migrations/              # Database migrations (339+)
│   └── config.toml              # Supabase configuration
├── tests/
│   └── e2e/                     # Playwright E2E tests
├── scripts/                     # Build & automation scripts
│   ├── generate-sitemap.js      # SEO sitemap generation
│   ├── copy-404.js              # SPA routing setup
│   ├── update-sw-version.js     # Service worker versioning
│   ├── performance-audit.js     # Performance monitoring
│   ├── check-performance-budget.js
│   ├── purge-cloudflare-cache.js # CDN cache management
│   ├── convert-images-to-webp.js # Image optimization
│   ├── mobile/                  # Mobile build scripts
│   └── [more utilities]
├── public/                      # Static assets
├── android/                     # Android app (Capacitor)
├── ios/                         # iOS app (Capacitor)
├── mobile-native/               # React Native app (Expo)
├── app/                         # Expo app entry
├── docs/                        # Documentation
├── media/                       # Media assets
└── [config files]               # Various configuration files
```

### Component Domains (115+ directories)
The codebase is organized into domain-specific component directories for better maintainability:

**Core UI**: ui, layout, layouts, navigation, common, shared
**Admin & Management**: admin, settings, operations, monitoring, hub
**Financial**: financial, job-costing, billing, payments, invoices, expenses, procurement, purchasing
**Project Management**: projects, project, estimates, scheduling, schedule, tasks, daily-reports
**Time & Attendance**: time, time-tracking, timesheets, gps
**Team & HR**: crew, contacts, subcontractors, service
**Client Relations**: client, client-portal, portal, crm, leads, lead
**Documents**: documents, gallery, ocr, storage
**Compliance & Safety**: safety, compliance, legal, quality, audit, bonds, permits, warranty
**Communication**: communication, collaboration, email, notifications, realtime
**Analytics & BI**: analytics, dashboard, reports, performance
**AI & Automation**: ai, workflow, workflows, automated
**Mobile & Native**: mobile, native, pwa, offline
**Marketing & Growth**: marketing, growth, funnel, conversion, seo, social-media, affiliate
**Tools**: calculator, calendar, equipment, inventory, materials, weather, tools
**Infrastructure**: infrastructure, deployment, security, errors, loading, debug
**Testing**: testing, accessibility, usability
**Enterprise**: enterprise, integrations

---

## Development Environment Setup

### Prerequisites
- Node.js 18+ (check with `node --version`)
- npm 9+ (check with `npm --version`)
- Git

### Quick Start
```bash
# Clone the repository
git clone <repository-url>
cd project-profit-radar

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Configuration
The application uses Supabase for backend services. The configuration is already set up in:
- `/src/integrations/supabase/client.ts`
- Database URL and keys are configured for the development environment

---

## Available Commands

### Development
```bash
npm run dev                    # Start development server on port 8080
npm run preview                # Preview production build locally
```

### Building
```bash
npm run build                  # Production build with sitemap generation
npm run build:dev              # Development build
npm run build:prod             # Production build (optimized)
npm run build:cloudflare       # Build for Cloudflare Pages
npm run build:analyze          # Build with bundle analyzer
```

### Testing
```bash
# Unit Tests (Vitest)
npm run test                   # Run tests in watch mode
npm run test:run               # Run tests once
npm run test:ui                # Open Vitest UI
npm run test:coverage          # Generate coverage report
npm run test:watch             # Watch mode

# E2E Tests (Playwright)
npm run test:e2e               # Run E2E tests
npm run test:e2e:ui            # Run with Playwright UI
npm run test:e2e:headed        # Run in headed mode (visible browser)
npm run test:e2e:debug         # Debug mode
npm run test:e2e:report        # Show test report

# Performance & Quality
npm run lighthouse             # Run Lighthouse audit
npm run lighthouse:full        # Build + full Lighthouse audit
npm run performance:audit      # Custom performance audit
npm run performance:budget     # Check performance budget
npm run performance:ci         # Full CI performance check
```

### Code Quality
```bash
npm run lint                   # Run ESLint
npm run security-check         # Security audit (Windows)
npm run analyze                # Analyze bundle
```

### Mobile Development
```bash
# Expo (React Native)
npm run expo:start             # Start Expo dev server
npm run expo:android           # Run on Android
npm run expo:ios               # Run on iOS
npm run expo:web               # Run web version
npm run expo:build:android     # Build Android app (EAS)
npm run expo:build:ios         # Build iOS app (EAS)

# Capacitor (Native)
npm run mobile:sync            # Sync web assets to native
npm run mobile:open:ios        # Open iOS project in Xcode
npm run mobile:open:android    # Open Android project in Android Studio
npm run mobile:run:ios         # Build and run iOS app
npm run mobile:run:android     # Build and run Android app
npm run mobile:build           # Build mobile apps
npm run mobile:version         # Bump version numbers
```

### Utilities
```bash
npm run generate-sitemap       # Generate SEO sitemap
npm run images:optimize        # Convert images to WebP
npm run optimize:fonts         # Optimize font files
```

### MCP Servers
```bash
npm run mcp:puppeteer          # Run Puppeteer MCP server
npm run mcp:context7           # Run Upstash Context7 MCP
npm run mcp:supabase           # Run Supabase MCP server
```

---

## Database Architecture

### Core Tables (339+ migrations)
**Company & Users**:
- `companies`: Company profiles, subscription info, multi-tenant data
- `user_profiles`: User accounts with role-based access
- `tenants`: Multi-tenant isolation (white-label support)

**Projects & Operations**:
- `projects`: Construction projects and metadata
- `project_templates`: Reusable project templates
- `time_entries`: Time tracking for workers
- `timesheet_approvals`: Approval workflow
- `change_orders`: Change order management
- `daily_reports`: Daily progress reports
- `daily_report_templates`: Template system

**Financial**:
- `financial_records`: Job costing and financial data
- `invoices`: Invoice management
- `payments`: Payment tracking
- `expenses`: Expense tracking
- `estimates`: Project estimates
- `estimate_templates`: Reusable estimate templates
- `estimate_line_items`: Line item library

**Documents & Media**:
- `documents`: Document management system
- `equipment_qr_codes`: QR code tracking

**CRM & Sales**:
- `crm_contacts`: Contact management
- `crm_leads`: Lead tracking
- `crm_campaigns`: Marketing campaigns

**Compliance & Security**:
- `audit_logs`: Blockchain-style tamper-proof audit logs
- `sso_configurations`: SSO/SAML settings
- `mfa_configurations`: Multi-factor auth
- `permission_grants`: RBAC permissions
- `compliance_reports`: GDPR, SOC2, HIPAA reports

**Filters & Preferences**:
- `saved_filter_presets`: User-saved filter configurations

**GPS & Location**:
- `crew_gps_checkins`: GPS-based time tracking

**API & Integrations**:
- `api_keys`: API key management
- `webhooks`: Webhook subscriptions

### Key Database Features
- **Multi-site architecture**: Complete site isolation with `site_id` on all tables
- **Two-layer isolation**: Site-level + Company-level data separation
- **Role-based access control**: 7+ user roles with granular permissions
- **Real-time collaboration**: Supabase Realtime for live updates
- **Audit logging**: Tamper-proof blockchain-style audit trails
- **Subscription management**: Integrated with Stripe
- **GPS tracking**: Geofencing and location-based time tracking
- **Template systems**: Projects, estimates, reports
- **SSO/MFA support**: Enterprise authentication
- **Compliance automation**: GDPR, SOC2, HIPAA workflows

---

## Multi-Tenant Architecture (CRITICAL)

> **IMPORTANT FOR AI ASSISTANTS**: This section is critical for maintaining data isolation. All database operations, edge functions, and migrations MUST include proper `site_id` handling.

### Overview

BuildDesk uses a **unified multi-site architecture** where multiple Pearson Media products share a single Supabase database with complete data isolation. Each site (BuildDesk, RealEstate Bio, SalonPros Bio, etc.) is identified by a unique `site_id`.

### Site Identification

**BuildDesk Site ID**: When writing migrations or edge functions for BuildDesk, use the BuildDesk site record. For migrating external projects, each project gets its own `site_id`.

```sql
-- Get BuildDesk site_id
SELECT id FROM sites WHERE key = 'builddesk';

-- Sites table structure
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,           -- 'builddesk', 'realestate', 'salonpros'
  name TEXT NOT NULL,                 -- Display name
  domain TEXT NOT NULL,               -- Primary domain: 'build-desk.com'
  additional_domains TEXT[],          -- Staging & custom domains
  config JSONB DEFAULT '{}',          -- Branding, features, limits
  is_active BOOLEAN DEFAULT TRUE,
  is_production BOOLEAN DEFAULT FALSE
);
```

### Two-Layer Data Isolation

All data access is controlled by two layers of isolation:

**Layer 1: Site Isolation** (Required for ALL queries)
- Every tenant-visible table has `site_id UUID NOT NULL REFERENCES sites(id)`
- Prevents cross-site data access between products (BuildDesk vs RealEstate Bio)

**Layer 2: Company Isolation** (Within a site)
- `company_id` filters data within a site
- Prevents one BuildDesk customer from seeing another's data

```sql
-- Example RLS policy with two-layer isolation
CREATE POLICY "Users can view projects in their site and company"
  ON projects FOR SELECT
  USING (
    -- Layer 1: Site isolation (ALWAYS REQUIRED)
    site_id = auth.current_site_id()

    -- Layer 2: Company isolation
    AND company_id IN (
      SELECT company_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
  );
```

### Tables with site_id (30+ tables)

**Core Tables**: `companies`, `user_profiles`, `projects`, `time_entries`, `financial_records`, `documents`, `expenses`, `invoices`, `estimates`, `tasks`, `crm_contacts`, `crm_leads`, `notifications`, `audit_logs`, `crew_gps_checkins`, `daily_reports`, `change_orders`

**Extended Tables**: `project_templates`, `estimate_templates`, `daily_report_templates`, `timesheet_approvals`, `equipment_qr_codes`, `saved_filter_presets`, `payments`, `api_keys`, `webhooks`, `blog_posts`, `email_campaigns`, `seo_keywords`

### Critical Rules for Database Operations

#### ✅ ALWAYS DO:
```sql
-- Include site_id in new tables
ALTER TABLE new_table ADD COLUMN site_id UUID NOT NULL REFERENCES sites(id);

-- Filter by site_id in all queries
SELECT * FROM projects WHERE site_id = :site_id AND company_id = :company_id;

-- Create composite indexes
CREATE INDEX idx_table_site_company ON table_name(site_id, company_id);

-- Backfill existing data with correct site_id
UPDATE table_name SET site_id = (SELECT id FROM sites WHERE key = 'builddesk');
```

#### ❌ NEVER DO:
```sql
-- WRONG: Query without site_id filter
SELECT * FROM projects WHERE company_id = :company_id;  -- MISSING site_id!

-- WRONG: Insert without site_id
INSERT INTO projects (name, company_id) VALUES ('Test', :company_id);  -- MISSING site_id!

-- WRONG: Allow NULL site_id
ALTER TABLE new_table ADD COLUMN site_id UUID REFERENCES sites(id);  -- Missing NOT NULL!
```

### Edge Function Pattern (CRITICAL)

All edge functions MUST use the shared auth helpers to extract and validate `site_id`:

```typescript
// supabase/functions/your-function/index.ts
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Initialize auth context - extracts user AND site_id from JWT
  const authContext = await initializeAuthContext(req);
  if (!authContext) {
    return errorResponse('Unauthorized', 401);
  }

  const { user, siteId, supabase } = authContext;

  try {
    // ALWAYS include site_id in queries
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('site_id', siteId)      // ← REQUIRED for every query
      .eq('company_id', companyId);

    if (error) throw error;
    return successResponse({ projects: data });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
});
```

### Frontend Query Pattern

Use the `useSiteQuery` hook for all data fetching:

```typescript
// src/hooks/useSiteQuery.ts - Always use this for queries
import { useAuth } from '@/contexts/AuthContext';

export function useSiteQuery(queryKey, queryFn, options) {
  const { siteId } = useAuth();

  return useQuery({
    queryKey: [...queryKey, siteId],  // Include siteId in cache key
    queryFn: async () => {
      if (!siteId) throw new Error('No site_id available');
      return queryFn(siteId);
    },
    enabled: !!siteId,
    ...options,
  });
}

// Usage example
export function useProjects() {
  return useSiteQuery(['projects'], async (siteId) => {
    return supabase
      .from('projects')
      .select('*')
      .eq('site_id', siteId)  // ← ALWAYS filter by site_id
      .order('created_at', { ascending: false });
  });
}
```

### Migration Checklist

When creating new migrations:

- [ ] Add `site_id UUID NOT NULL REFERENCES sites(id)` to new tables
- [ ] Backfill existing data: `UPDATE table SET site_id = (SELECT id FROM sites WHERE key = 'builddesk')`
- [ ] Create index: `CREATE INDEX idx_table_site_id ON table(site_id)`
- [ ] Create composite index: `CREATE INDEX idx_table_site_company ON table(site_id, company_id)`
- [ ] Update RLS policies to include `site_id = auth.current_site_id()`

### Global/Public Functions (Exceptions)

Some functions are intentionally site-agnostic:

- **Public-facing**: Landing pages, marketing content, public blog posts
- **Cross-site admin**: Root admin functions that manage all sites
- **Platform-wide**: Site resolution, domain routing

For these functions, document clearly why site_id filtering is not applied.

### Multi-Tenant Documentation

For detailed implementation guides, see:

| Document | Location | Purpose |
|----------|----------|---------|
| Agent Instructions | `MULTI_TENANT_AGENT_INSTRUCTIONS.md` | Critical rules for AI agents |
| Migration Guide | `TENANT_MIGRATION_GUIDE.md` | Comprehensive migration procedures |
| Implementation Summary | `MULTI_SITE_MIGRATION_SUMMARY.md` | What was implemented |
| Master Guide | `docs/MULTI_SITE_MIGRATION_README.md` | Complete overview |
| Edge Functions | `docs/EDGE_FUNCTION_MULTI_SITE_MIGRATION.md` | Edge function patterns |
| Frontend Guide | `docs/FRONTEND_MULTI_SITE_MIGRATION.md` | Frontend integration |
| New Site Onboarding | `docs/NEW_WEBSITE_ONBOARDING_GUIDE.md` | Adding new sites |
| Testing Guide | `docs/MULTI_SITE_TESTING_GUIDE.md` | Testing procedures |
| Quick Reference | `docs/MULTI_SITE_QUICK_REFERENCE.md` | Quick commands |

### Helper Functions Reference

```typescript
// supabase/functions/_shared/auth-helpers.ts

// Initialize auth context from request
initializeAuthContext(req: Request): Promise<AuthContext | null>

// Verify user has access to company within site
verifyCompanyAccess(supabase, userId, companyId, siteId): Promise<boolean>

// Get user's role within site
getUserRole(supabase, userId, siteId): Promise<string | null>

// Check if user is admin within site
isAdmin(supabase, userId, siteId): Promise<boolean>

// Check if user is root admin (cross-site)
isRootAdmin(supabase, userId): Promise<boolean>

// Resolve site from domain
getSiteByDomain(supabase, domain): Promise<any | null>

// SQL helper function
auth.current_site_id(): UUID  -- Extract site_id from JWT
```

---

## Authentication & Authorization

### User Roles
1. **root_admin**: Platform administrator (super user)
2. **admin**: Company administrator (full company access)
3. **project_manager**: Project management access
4. **field_supervisor**: Field operations
5. **office_staff**: Office operations
6. **accounting**: Financial access
7. **client_portal**: Client view access

### Authentication Features
- **Supabase Auth**: Core authentication
- **SSO Support**: SAML 2.0, OAuth 2.0, LDAP
- **Apple Sign-In**: Native Apple authentication support
- **Multi-Factor Auth**: TOTP, SMS, Email
- **JWT tokens**: Secure API access
- **Session management**: Device tracking, trusted devices
- **Role-based routing**: Protected routes based on permissions
- **Session persistence**: Auto-login on refresh

---

## Key Features Implementation

### Financial Management
- **Real-time job costing**: Live cost tracking per project
- **Budget vs actual**: Variance analysis and alerts
- **Cash flow forecasting**: Financial projections
- **Stripe integration**: Automated billing and payments
- **QuickBooks sync**: Enhanced 2-way accounting integration with automatic reconciliation
- **Estimate templates**: Reusable estimate templates
- **Line item library**: Standard line items across estimates
- **Financial health checks**: Automated project profitability analysis

### Project Management
- **Project scheduling**: Gantt charts and timelines
- **Change order management**: Workflow and approvals
- **Document management**: Version control and categorization
- **Daily reports**: Progress tracking and reporting with templates
- **Project templates**: Quick project setup from templates
- **Bulk operations**: Multi-project actions
- **Saved filters**: Custom filter presets

### Time Tracking & GPS
- **GPS time tracking**: Geofencing for clock in/out
- **Advanced geofencing**: Configurable job site boundaries with automatic alerts
- **Crew check-ins**: Location-based attendance
- **Timesheet approvals**: Multi-level approval workflow
- **Mobile time tracking**: Native mobile app support
- **Offline capability**: Work without connectivity

### CRM & Sales
- **Contact management**: Centralized contact database
- **Lead tracking**: Pipeline management
- **Campaign management**: Marketing automation
- **Lead intelligence**: AI-powered insights

### Collaboration
- **Team messaging**: Real-time communication
- **Client portal**: External stakeholder access
- **File sharing**: Document collaboration
- **Progress updates**: Automated notifications
- **Real-time updates**: Live data synchronization

### AI-Powered Features
- **AI estimating**: Automated estimate generation
- **Content generation**: Blog and marketing content
- **Image analysis**: Photo classification and insights
- **Quality control**: AI-powered inspection
- **Support tickets**: Automated ticket analysis
- **AI search optimization**: Enhanced discoverability for AI-powered search engines

### Compliance & Security
- **Audit logging**: Complete activity tracking
- **GDPR compliance**: Data subject requests, retention policies
- **SOC2 ready**: Enterprise security controls
- **HIPAA support**: Healthcare data protection
- **SSO/SAML**: Enterprise authentication
- **MFA**: Multi-factor authentication
- **RBAC**: Role-based access control

### Enterprise Features (Phase 4)
- **Multi-tenant architecture**: White-label deployments
- **Public API**: RESTful API for integrations
- **Webhook system**: Real-time event notifications
- **Developer portal**: Third-party integration ecosystem
- **Advanced permissions**: Resource-specific grants
- **Compliance automation**: Report generation

---

## Mobile Strategy

### Multi-Platform Approach
BuildDesk uses a hybrid mobile strategy:

1. **Capacitor (Production)**: Native iOS/Android apps
   - Built on web codebase
   - Native device APIs (camera, GPS, notifications)
   - App Store & Google Play distribution
   - Offline-first architecture

2. **Expo (Development)**: React Native integration
   - Native UI components
   - EAS Build for cloud builds
   - Over-the-air updates
   - Future migration path

### Mobile Features
- **Camera integration**: Photo capture for documentation
- **Geolocation**: GPS tracking for time entries and geofencing
- **Offline sync**: Work without internet connectivity
- **Push notifications**: Real-time alerts
- **Local storage**: Offline data persistence
- **Native performance**: Hardware-accelerated UI
- **Biometric auth**: Fingerprint/Face ID support (planned)
- **Service worker versioning**: Automatic cache management and updates

### Mobile Development Workflow
```bash
# Web development (primary)
npm run dev

# Capacitor native
npm run mobile:sync              # Sync web build to native
npm run mobile:open:ios          # Open Xcode
npm run mobile:run:android       # Run on Android device

# Expo (alternative)
npm run expo:start               # Start Expo
npm run expo:build:android       # Cloud build
```

---

## API Architecture

### Supabase Edge Functions (154+)
Located in `/supabase/functions/`, categorized by domain:

**Payments & Billing**:
- `stripe-webhooks`: Payment processing

**AI Services**:
- `ai-content-generator`: Content generation
- `ai-estimating`: Automated estimating
- `analyze-images`: Image classification
- `analyze-support-ticket`: Ticket routing

**Analytics**:
- `analytics-oauth-google`: Google Analytics integration
- `bing-search-api`, `bing-webmaster-api`: SEO analytics

**Blog & Content**:
- `blog-ai`: AI blog generation
- `blog-ai-automation`: Scheduled content
- `blog-social-integration`: Social media posting

**SEO**:
- `analyze-semantic-keywords`: Keyword analysis
- `apply-seo-fixes`: Automated SEO improvements
- `analyze-internal-links`: Link analysis

**Automation**:
- `auto-scheduling`: Intelligent scheduling
- `auto-intervention-scheduler`: Proactive alerts

**API Management**:
- `api-auth`: API key authentication
- `api-management`: API endpoint management

### Authentication Pattern
All edge functions follow this pattern:
```typescript
// Verify JWT token
const authHeader = req.headers.get('Authorization');
const token = authHeader?.replace('Bearer ', '');
const { data: { user } } = await supabaseClient.auth.getUser(token);

// Check RBAC permissions
// Apply company-level data isolation (RLS)
// Return JSON response
```

### API Response Format
```typescript
{
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}
```

---

## Configuration Files

### Key Configuration Files

**Build & Bundling**:
- `vite.config.ts`: Build configuration with advanced optimizations
  - Manual chunking for optimal caching
  - Image optimization (WebP, AVIF)
  - Bundle visualization
  - Tree shaking and code splitting
  - Mobile fallbacks for native modules
  - Console stripping in production
- `tsconfig.json`: TypeScript configuration
- `tailwind.config.ts`: Styling configuration
- `postcss.config.js`: CSS processing

**Testing**:
- `vitest.config.ts`: Unit test configuration (Happy DOM, V8 coverage)
- `playwright.config.ts`: E2E test configuration (multi-browser)
- `lighthouserc.js`: Lighthouse performance audits

**Mobile**:
- `capacitor.config.ts`: Native app configuration
- `app.config.js`: Expo configuration
- `eas.json`: Expo Application Services build config
- `metro.config.cjs`: React Native bundler

**Deployment**:
- `wrangler.toml`: Cloudflare Pages deployment
- `package.json`: Dependencies and scripts
- `.npmrc`: npm configuration (packageManager: npm@10.9.2)
- `.nvmrc`: Node version specification

**Code Quality**:
- `eslint.config.js`: ESLint rules (TypeScript, React, Hooks)
- `components.json`: shadcn/ui configuration

**Supabase**:
- `supabase/config.toml`: Supabase project configuration

### Build Optimizations

**Vite Build Strategy**:
1. **Manual Chunking**: Separate chunks for framework, UI, utilities, features
2. **Asset Optimization**: Images, fonts organized by type with hashing
3. **Tree Shaking**: Aggressive unused code elimination
4. **Code Splitting**: Route-based and feature-based splitting
5. **CSS Optimization**: CSS code splitting and minification
6. **Console Stripping**: Remove console.log in production
7. **Compression**: Gzip and Brotli size reporting

**Performance Targets**:
- Bundle size: ~1MB optimized
- Chunk size warning: 400KB
- Lighthouse score: 90+
- Time to Interactive: <3s

---

## Testing Strategy

### Unit Testing (Vitest)
- **Framework**: Vitest 4.0.8 with Happy DOM
- **Coverage**: V8 provider with 60% thresholds
- **Location**: `src/**/*.test.ts`, `src/**/__tests__/**`
- **Setup**: `src/test/setup.ts`
- **UI**: Vitest UI for interactive testing

**Example Test**:
```typescript
// src/lib/__tests__/utils.test.ts
import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../utils';

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });
});
```

### E2E Testing (Playwright)
- **Framework**: Playwright 1.56.1
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile**: Pixel 5, iPhone 12 viewports
- **Location**: `tests/e2e/`
- **Features**: Screenshots, videos, traces on failure
- **CI Integration**: GitHub Actions support

**Example Test**:
```typescript
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test('user can log in', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Sign In');
  await page.fill('[name="email"]', 'user@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

### Performance Testing
- **Lighthouse CI**: Automated performance audits
- **Web Vitals**: Core Web Vitals monitoring
- **Performance Budget**: Custom budget checks
- **Bundle Analysis**: Rollup visualizer

### Security Testing
- **Input Sanitization**: DOMPurify for user input
- **Schema Validation**: Zod for form validation
- **Security Audits**: `npm run security-check`

### Testing Best Practices
1. **Write tests for**:
   - Utility functions
   - Security-critical code
   - Business logic
   - API integrations
   - User workflows

2. **Test coverage goals**:
   - Functions: 60%+
   - Branches: 60%+
   - Lines: 60%+

3. **E2E test patterns**:
   - Critical user journeys
   - Cross-browser compatibility
   - Mobile responsiveness
   - Error handling

---

## Performance Considerations

### Build Performance
- **Bundle size**: ~1MB optimized (gzipped)
- **Chunk splitting**: Framework, UI, features separated
- **Lazy loading**: Route-based code splitting
- **CDN optimization**: Cloudflare Pages global edge
- **Asset optimization**: WebP/AVIF images, font subsetting
- **Tree shaking**: Aggressive unused code removal

### Runtime Performance
- **React Query**: Efficient data fetching and caching
- **Memoization**: useMemo, useCallback for expensive operations
- **Real-time updates**: Efficient WebSocket usage with Supabase
- **Progressive loading**: Skeleton states and loading indicators
- **Virtual scrolling**: For long lists (planned)
- **Service Workers**: PWA support with automatic versioning

### Mobile Performance
- **Native APIs**: Capacitor for hardware acceleration
- **Offline-first**: IndexedDB for local data
- **Optimistic updates**: Immediate UI feedback
- **Background sync**: Queue actions for offline
- **Image compression**: Automatic optimization before upload

### Monitoring
- **Sentry**: Error tracking and performance monitoring
- **PostHog**: Product analytics
- **Web Vitals**: Core Web Vitals tracking
- **Lighthouse CI**: Automated performance audits

---

## Security Features

### Authentication Security
- **JWT tokens**: Secure API access with short expiration
- **SSO/SAML**: Enterprise single sign-on
- **MFA**: Multi-factor authentication (TOTP, SMS, Email)
- **Session management**: Device tracking, trusted devices
- **Password security**: Supabase Auth best practices
- **Biometric auth**: Planned for mobile

### Data Security
- **Row Level Security**: Database-level access control
- **Multi-tenant isolation**: Complete data separation
- **HTTPS enforcement**: All communications encrypted
- **Input validation**: Zod schema validation
- **Input sanitization**: DOMPurify for XSS prevention
- **CSRF protection**: Built-in protections
- **API key rotation**: Automated key management

### Compliance
- **GDPR**: Data subject requests, right to erasure, retention policies
- **SOC2**: Security controls and audit logs
- **HIPAA**: Healthcare data protection (optional)
- **Audit logging**: Blockchain-style tamper-proof logs
- **Data retention**: Configurable retention policies
- **Compliance reports**: Automated report generation

### Security Best Practices
1. **Never commit secrets**: Use environment variables
2. **Validate all inputs**: Use Zod schemas
3. **Sanitize outputs**: Use DOMPurify
4. **Use RLS**: All tables have Row Level Security
5. **Audit everything**: All critical actions logged
6. **Principle of least privilege**: Minimal permissions

---

## Development Guidelines for AI Assistants

### Code Standards
- **TypeScript**: Strict type checking enabled
- **ESLint**: Configured for React/TypeScript
- **Component patterns**: Functional components with hooks
- **State management**: Context for global state, TanStack Query for server state
- **Naming conventions**:
  - Components: PascalCase
  - Hooks: camelCase with "use" prefix
  - Utils: camelCase
  - Constants: UPPER_SNAKE_CASE

### Component Architecture
- **shadcn/ui**: Use for all UI components
- **Atomic design**: Build reusable component patterns
- **Accessibility**: ARIA compliance and keyboard navigation required
- **Theme support**: All components support dark/light theme
- **Mobile-first**: Design for mobile, enhance for desktop

### File Organization
```typescript
// Component structure
ComponentName/
  ├── ComponentName.tsx          // Main component
  ├── ComponentNameForm.tsx      // Sub-components
  ├── ComponentNameList.tsx
  └── index.ts                   // Re-exports

// Hook structure
hooks/
  ├── useComponentName.ts        // Feature hook
  └── useComponentNameQuery.ts   // Data fetching hook

// Type structure
types/
  └── componentName.ts           // Type definitions
```

### API Integration Pattern
```typescript
// Use TanStack Query with site_id isolation for all API calls
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// PREFERRED: Use useSiteQuery hook for automatic site_id handling
import { useSiteQuery } from '@/hooks/useSiteQuery';

export const useProjects = () => {
  return useSiteQuery(['projects'], async (siteId) => {
    return supabase
      .from('projects')
      .select('*')
      .eq('site_id', siteId)  // ← REQUIRED: Always filter by site_id
      .order('created_at', { ascending: false });
  });
};

// For mutations, include site_id from AuthContext
export const useCreateProject = () => {
  const { siteId } = useAuth();

  return useMutation({
    mutationFn: async (project: NewProject) => {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...project,
          site_id: siteId,  // ← REQUIRED: Always include site_id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });
};
```

### Security Guidelines
```typescript
// Always sanitize user input
import DOMPurify from 'dompurify';

const sanitizedContent = DOMPurify.sanitize(userInput);

// Always validate with Zod
import { z } from 'zod';

const projectSchema = z.object({
  name: z.string().min(1).max(100),
  budget: z.number().positive(),
  start_date: z.string().datetime(),
});

// Use type-safe validation
const validatedData = projectSchema.parse(formData);
```

### Testing Guidelines
```typescript
// Unit test example
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectCard } from './ProjectCard';

describe('ProjectCard', () => {
  it('renders project name', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });
});

// E2E test example
import { test, expect } from '@playwright/test';

test('create new project', async ({ page }) => {
  await page.goto('/projects');
  await page.click('text=New Project');
  await page.fill('[name="name"]', 'Test Project');
  await page.click('button[type="submit"]');
  await expect(page.locator('text=Test Project')).toBeVisible();
});
```

### Git Workflow
- **Branch naming**: `feature/description`, `fix/description`, `claude/description-sessionId`
- **Commit messages**: Conventional commit format
  ```
  feat: add project template system
  fix: resolve GPS tracking issue
  docs: update CLAUDE.md with latest features
  test: add E2E tests for authentication
  ```
- **Pull requests**: Required for all changes
- **Automated deployment**: Cloudflare Pages on merge to main

### Common Patterns

**Form Handling**:
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const form = useForm({
  resolver: zodResolver(projectSchema),
  defaultValues: { name: '', budget: 0 },
});
```

**Error Handling**:
```typescript
import { toast } from 'sonner';

try {
  await createProject(data);
  toast.success('Project created successfully');
} catch (error) {
  console.error('Error creating project:', error);
  toast.error('Failed to create project');
}
```

**Loading States**:
```typescript
import { Skeleton } from '@/components/ui/skeleton';

if (isLoading) return <Skeleton className="h-20" />;
if (error) return <div>Error: {error.message}</div>;
return <ProjectList projects={data} />;
```

### Performance Best Practices
1. **Lazy load routes**: Use React.lazy for route components
2. **Memoize expensive calculations**: Use useMemo
3. **Debounce search inputs**: Use debounce utility
4. **Optimize images**: Use WebP/AVIF format
5. **Virtualize long lists**: Use react-virtual (when needed)
6. **Minimize re-renders**: Use React.memo for expensive components

---

## Supabase Integration

### Client Setup
```typescript
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);
```

### Type Generation
```bash
# Generate TypeScript types from database schema
npx supabase gen types typescript --project-id ilhzuvemiuyfuxfegtlv > src/integrations/supabase/types.ts
```

### RLS (Row Level Security)
All tables use RLS policies for security:
```sql
-- Example RLS policy
CREATE POLICY "Users can view own company projects"
ON projects FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM user_profiles
    WHERE user_id = auth.uid()
  )
);
```

### Real-time Subscriptions
```typescript
import { useEffect } from 'react';

useEffect(() => {
  const channel = supabase
    .channel('projects')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'projects',
    }, (payload) => {
      console.log('Project updated:', payload);
      queryClient.invalidateQueries(['projects']);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

---

## Deployment

### Cloudflare Pages
```bash
# Build settings
Build command: npm ci && npm run build
Build output directory: dist
Node.js version: 18+
Environment variables: (set in Cloudflare dashboard)
```

### Environment Variables
Key environment variables (set in Cloudflare):
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `STRIPE_PUBLISHABLE_KEY`: Stripe public key
- (Edge function secrets managed in Supabase)

### Domain Configuration
- **Primary**: builddesk.pearsonperformance.workers.dev
- **Custom domain**: build-desk.com
- **SSL/TLS**: Managed by Cloudflare
- **DNS**: Cloudflare DNS with DNSSEC

### Deployment Pipeline
1. Push to branch
2. Create pull request
3. Automated preview deployment (Cloudflare)
4. Code review
5. Merge to main
6. Automated production deployment
7. Lighthouse audit (CI)

### Mobile Deployment

**iOS (App Store)**:
```bash
npm run mobile:sync
npm run mobile:open:ios
# Build in Xcode → Archive → Upload to App Store Connect
```

**Android (Google Play)**:
```bash
npm run mobile:sync
npm run mobile:open:android
# Build → Generate Signed Bundle → Upload to Play Console
```

**Expo (Alternative)**:
```bash
npm run expo:build:ios
npm run expo:build:android
npm run expo:submit:ios
npm run expo:submit:android
```

---

## Monitoring & Support

### Error Tracking
- **Sentry**: Real-time error tracking and performance monitoring
- **Console logging**: Structured logging (development only)
- **Error boundaries**: React error boundaries for graceful failures

### Analytics
- **PostHog**: Product analytics and feature flags
- **Web Vitals**: Core Web Vitals monitoring
- **Custom events**: User interaction tracking

### Performance Monitoring
- **Lighthouse CI**: Automated performance audits
- **Performance budgets**: Enforced via CI
- **Custom metrics**: Time to Interactive, First Contentful Paint

### Backup & Recovery
- **Database backups**: Supabase managed (automated daily)
- **Point-in-time recovery**: Available via Supabase
- **File storage**: Supabase Storage with redundancy
- **Configuration**: Version controlled in Git
- **Disaster recovery**: Multi-region Cloudflare deployment

---

## Known Issues & Technical Debt

### High Priority
1. **Test coverage**: Increase from current ~10% to 60%+
2. **Offline sync**: More robust offline queue for mobile
3. **Performance**: Virtual scrolling for large lists

### Medium Priority
1. **Bundle size**: Further optimization needed (target: <800KB)
2. **Accessibility**: Full WCAG 2.1 AA compliance
3. **i18n**: Internationalization support
4. **Dark mode**: Full dark mode parity

### Low Priority
1. **Desktop app**: Electron wrapper
2. **Browser extensions**: Chrome/Firefox extensions
3. **Component storybook**: Interactive documentation

---

## Future Roadmap

### Immediate Priorities
1. **Testing**: Increase test coverage to 60%+
2. **Performance**: Maintain Lighthouse 90+ score
3. **Mobile polish**: iOS/Android app store submission
4. **Documentation**: Complete API documentation

### Medium-term Goals
1. **Advanced analytics**: AI/ML-powered insights
2. **Integration marketplace**: Third-party connector ecosystem
3. **Public API**: Developer platform launch
4. **White-label**: Multi-tenant production deployment

### Long-term Vision
1. **Industry specialization**: Vertical-specific features (residential, commercial, industrial)
2. **Global expansion**: Multi-region deployment, i18n
3. **Enterprise features**: Advanced compliance, custom integrations
4. **Marketplace ecosystem**: Plugin architecture, app store

---

## Quick Reference

### Common File Paths
- **Supabase client**: `src/integrations/supabase/client.ts`
- **Supabase types**: `src/integrations/supabase/types.ts`
- **Auth context**: `src/contexts/AuthContext.tsx`
- **Theme context**: `src/contexts/ThemeContext.tsx`
- **Site query hook**: `src/hooks/useSiteQuery.ts` (multi-tenant queries)
- **Auth helpers**: `supabase/functions/_shared/auth-helpers.ts` (edge function auth + site_id)
- **UI components**: `src/components/ui/`
- **Utils**: `src/lib/`, `src/utils/`
- **Types**: `src/types/`

### Common Operations
```bash
# Start development
npm install && npm run dev

# Run tests
npm run test:run
npm run test:e2e

# Build for production
npm run build

# Analyze bundle
npm run build:analyze

# Run mobile
npm run mobile:sync && npm run mobile:run:android
```

### Component Import Pattern
```typescript
// UI components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Hooks
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';

// Utils
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatters';

// Types
import type { Project } from '@/types/project';
```

### Database Query Pattern
```typescript
// CRITICAL: Always include site_id in queries for multi-tenant isolation

// Select with site_id + RLS
const { data, error } = await supabase
  .from('projects')
  .select('*, company:companies(*)')
  .eq('site_id', siteId)           // ← REQUIRED: Site isolation
  .eq('status', 'active')
  .order('created_at', { ascending: false });

// Insert with site_id + RLS
const { data, error } = await supabase
  .from('projects')
  .insert({
    name,
    budget,
    company_id,
    site_id: siteId,               // ← REQUIRED: Include site_id
  })
  .select()
  .single();

// Update with site_id + RLS
const { data, error } = await supabase
  .from('projects')
  .update({ status: 'completed' })
  .eq('site_id', siteId)           // ← REQUIRED: Site isolation
  .eq('id', projectId)
  .select();
```

---

## Support & Resources

### Documentation
- **This file**: `CLAUDE.md` - Main reference for AI assistants
- **README.md**: Quick start guide
- **Multi-tenant (CRITICAL)**:
  - `MULTI_TENANT_AGENT_INSTRUCTIONS.md` - Critical rules for AI agents
  - `TENANT_MIGRATION_GUIDE.md` - Comprehensive migration guide
  - `MULTI_SITE_MIGRATION_SUMMARY.md` - Implementation summary
  - `docs/MULTI_SITE_MIGRATION_README.md` - Master guide
  - `docs/EDGE_FUNCTION_MULTI_SITE_MIGRATION.md` - Edge function patterns
  - `docs/FRONTEND_MULTI_SITE_MIGRATION.md` - Frontend integration
- **Phase documentation**: `PHASE4_COMPLETE_SUMMARY.md` and similar
- **API docs**: `/docs` directory
- **Expo docs**: Multiple `EXPO_*.md` files
- **Mobile docs**: `MOBILE_*.md` files

### External Resources
- [Supabase Documentation](https://supabase.com/docs)
- [React 19 Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [TanStack Query](https://tanstack.com/query)
- [Vitest](https://vitest.dev)
- [Playwright](https://playwright.dev)
- [Capacitor](https://capacitorjs.com)
- [Expo](https://docs.expo.dev)

### Contact & Support
- **Repository**: GitHub (check git remote)
- **CI/CD**: Cloudflare Pages
- **Database**: Supabase Dashboard
- **Error tracking**: Sentry Dashboard
- **Analytics**: PostHog Dashboard

---

**Last Updated**: 2025-11-29
**Version**: 2.2
**Platform Status**: ~95% Complete (Phase 5 in progress)
**Architecture**: Multi-tenant with site_id isolation (see Multi-Tenant Architecture section)
**Next Milestone**: Production Launch & App Store Submissions

---

*This documentation is maintained for AI assistants (Claude, GPT, etc.) to understand the BuildDesk platform architecture, conventions, and best practices. Keep this file updated as the platform evolves.*
