# src/pages/ - Route Pages

## Purpose
Top-level page components mapped to routes. Each file is a full page rendered by React Router.

## Conventions
- **196+ page files** — one per route (e.g., `Dashboard.tsx`, `Auth.tsx`, `Invoices.tsx`).
- Pages import from `@/components/*` for UI, `@/hooks/*` for data, `@/contexts/*` for auth/theme.
- Use `DashboardLayout` or similar layout wrappers for authenticated pages.
- Subdirectories group related pages: `admin/`, `features/`, `settings/`, `tools/`, `resources/`.

## Data Pattern
```tsx
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

const MyPage = () => {
  const { userProfile } = useAuth();
  // Always gate queries on userProfile?.company_id
};
```

## Loading & Error States
- Show `<Skeleton>` components while data loads (not blank screens).
- Show `<Alert variant="destructive">` with a Retry button on fetch errors.
- Import Skeleton from `@/components/ui/skeleton`, Alert from `@/components/ui/alert`.

## Key Pages
- **Dashboard.tsx** - Main KPI dashboard with error/retry handling.
- **Auth.tsx / AuthCallback.tsx** - Login, signup, OAuth callback.
- **Setup.tsx** - First-time company onboarding.
- **FinancialDashboard.tsx** - Financial overview with loading skeleton.
- **Invoices.tsx** - Invoice list with table skeleton.
- **CRMDashboard.tsx** - CRM overview with lead/opportunity actions.

## Pitfalls
- Don't use bare `console.error` — use `logger.error`.
- Don't leave TODO/placeholder handlers — wire to real navigation or toast feedback.
- Pages with `Math.random()` mock data have been cleaned — use deterministic values.
