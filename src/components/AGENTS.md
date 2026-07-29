# src/components/ - UI Components

## Purpose
115+ domain-specific component directories plus shared UI primitives.

## Conventions
- **UI primitives** in `ui/` - shadcn/ui components (Button, Card, Input, etc.)
- **Domain components** organized by feature: `financial/`, `dashboard/`, `projects/`, etc.
- **Functional components only** - no class components
- **Props**: Use named interfaces, not inline types

## Component Structure
```
ComponentName/
  ComponentName.tsx       # Main component
  ComponentNameForm.tsx   # Sub-components
  index.ts                # Re-exports
```

## Patterns
```tsx
// Always import UI from @/components/ui/
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Use cn() for conditional classes
<div className={cn('base-class', isActive && 'active-class')}>

// Loading states with Skeleton
import { Skeleton } from '@/components/ui/skeleton';
if (loading) return <Skeleton className="h-48" />;
```

## Error boundaries (US-265)
There is exactly **one** canonical error boundary: `@/components/ErrorBoundary`. Do not create new
boundary components — select the UX shape via the `variant` prop:
```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

<ErrorBoundary variant="route">…</ErrorBoundary>     // lazy routes (handles chunk-load failures)
<ErrorBoundary variant="feature" featureName="Financials">…</ErrorBoundary> // feature section
<ErrorBoundary variant="critical">…</ErrorBoundary>  // app-shell / full-screen
<ErrorBoundary variant="inline">…</ErrorBoundary>    // compact Alert for small subtrees
<ErrorBoundary>…</ErrorBoundary>                      // default centered card
```
Pass `fallback` (element or `(error) => ReactNode`) to override, or `withErrorBoundary(Component, props)`
as an HOC. All variants log to `errorLoggingService` + Sentry automatically. The old
`RouteErrorBoundary` / `FeatureErrorBoundary` / `CriticalErrorBoundary` / `ui/ErrorBoundary` components
were removed; `ui/error-boundary` now only exports the `ErrorState` / `EmptyState` helpers (and re-exports
the canonical boundary for back-compat).

## Accessibility
- Components in `accessibility/` provide WCAG 2.1 AA wrappers
- Reference implementation: `src/pages/MyTasks.tsx`
- All icon-only buttons need `aria-label`
- Decorative icons need `aria-hidden="true"`

## Pitfalls
- Don't import from `@/components/ui/` into other `ui/` components (circular)
- Always provide loading states for data-driven components
- Use `toast` from `@/hooks/use-toast` for user feedback, not alerts
