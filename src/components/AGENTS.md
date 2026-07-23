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

## Loading states
Never render literal `Loading...` text or an ad-hoc spinner. Use the shared
`Skeleton` primitive (`@/components/ui/skeleton`) or, for common layouts, a
composition from the canonical set in **`@/components/ui/skeletons`**:

```tsx
import { Skeleton } from '@/components/ui/skeleton';
import { TableSkeleton, ListSkeleton, CardSkeleton, DataTablePageSkeleton } from '@/components/ui/skeletons';

if (loading) return <DataTablePageSkeleton />;        // full data page (header + table)
{loading ? <TableSkeleton rows={5} /> : <Table ... />}  // a table/list section
{loading ? <Skeleton className="h-4 w-24" /> : <span>{value}</span>}  // a single field
```

- `@/components/ui/skeletons.tsx` is the **canonical** composition source
  (Card/Table/TableRow/List/ListItem/StatCard/Dashboard/Form/ProjectCard/
  PageHeader/DataTablePage/ChartCard). Add new shared compositions here, not in
  a new `*Skeleton*` file. (`ui/skeleton-loader.tsx` and `ui/loading-skeleton.tsx`
  still exist for legacy call sites and should be migrated here over time.)
- **PR guidance:** flag any literal `>Loading...<` JSX in review — replace it
  with a Skeleton where a layout placeholder fits. A bare full-screen auth/route
  gate is the one acceptable exception.

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
