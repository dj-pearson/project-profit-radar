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

## Error handling
Use the single canonical error boundary — `ErrorBoundary` from `@/components/ErrorBoundary`.
Do **not** create bespoke boundary components; pick behaviour with the `level` prop:

```tsx
import ErrorBoundary from '@/components/ErrorBoundary';

<ErrorBoundary level="critical">{appShell}</ErrorBoundary>              // full-screen app shell
<ErrorBoundary level="route">{lazyRoute}</ErrorBoundary>               // lazy routes (detects chunk-load failures)
<ErrorBoundary level="feature" featureName="Financials">{...}</ErrorBoundary>  // a feature section
<ErrorBoundary>{riskySubtree}</ErrorBoundary>                          // level="component" (default)
```

- Levels: `component` (default) · `feature` (pass `featureName`, optional `icon`/`description`) · `route` (chunk-aware) · `critical` (app shell). All boundaries log to `errorLoggingService` + Sentry.
- Custom fallback via the `fallback` prop (node, element, or `(error) => ReactNode`). HOC helper: `withErrorBoundary(Component, boundaryProps)`.
- For **inline** (non-boundary) error/empty UI inside a page, use `ErrorState` / `EmptyState` from `@/components/ui/states` — these do not catch exceptions.

## Accessibility
- Components in `accessibility/` provide WCAG 2.1 AA wrappers
- Reference implementation: `src/pages/MyTasks.tsx`
- All icon-only buttons need `aria-label`
- Decorative icons need `aria-hidden="true"`

## Pitfalls
- Don't import from `@/components/ui/` into other `ui/` components (circular)
- Always provide loading states for data-driven components
- Use `toast` from `@/hooks/use-toast` for user feedback, not alerts
