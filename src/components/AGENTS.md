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

## Accessibility
- Components in `accessibility/` provide WCAG 2.1 AA wrappers
- Reference implementation: `src/pages/MyTasks.tsx`
- All icon-only buttons need `aria-label`
- Decorative icons need `aria-hidden="true"`

## Pitfalls
- Don't import from `@/components/ui/` into other `ui/` components (circular)
- Always provide loading states for data-driven components
- Use `toast` from `@/hooks/use-toast` for user feedback, not alerts
