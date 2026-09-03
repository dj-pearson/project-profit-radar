# src/ - Source Code Root

## Purpose
Main application source for the Brikly construction management SaaS platform.

## Key Conventions
- **Framework**: React 19 + TypeScript 5.9 + Vite
- **Path aliases**: `@/` maps to `src/` (configured in tsconfig.app.json)
- **State**: React Context for global state (AuthContext, ThemeContext), TanStack Query for server state
- **Styling**: Tailwind CSS with shadcn/ui components in `components/ui/`

## Import Patterns
```tsx
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
```

## Key Files
- `App.tsx` - Root component with routing
- `main.tsx` - Entry point
- `contexts/AuthContext.tsx` - Authentication state & role checking
- `integrations/supabase/client.ts` - Supabase client singleton
- `integrations/supabase/types.ts` - **generated** DB types. Regenerate with `npm run db:types` (needs the Supabase CLI + `SUPABASE_ACCESS_TOKEN`); never hand-edit — edits are overwritten on the next generation.
- `lib/logger.ts` - Production-safe logger (use instead of console.log)
- `lib/utils.ts` - Core utilities (cn, formatCurrency)

## Which table holds what work (US-329)

Three tables sound like they hold "the schedule" and they hold different things.
`schedule_tasks` is **the schedule**: dated, ordered work with finish-to-start
dependencies in `schedule_task_dependencies` and a saved plan in
`schedule_baselines`. Assign a crew through `schedule_task_assignees`, which
generates the `crew_assignments` row and notifies the person; never write
`crew_assignments` directly for scheduled work, or the day board and the Gantt
drift apart again. `crew_assignments` remains the day-level board and is still
written by hand for anything that is not a schedule task. `tasks` is the
**to-do list** - checklist items with an owner and a due date, no dates on a
Gantt, no dependencies - and is what My Tasks and the project hub's Tasks tab
read. `project_milestones` is for the customer-facing timeline (the few dates an
owner cares about), not for scheduling. `schedule_conflicts` is deprecated; the
`UNIQUE (crew_member_id, assigned_date, start_time)` constraint on
`crew_assignments` is the enforcement, which beats a table of reports.

## Common Pitfalls
- **Never use bare `console.log`** - use `logger` from `@/lib/logger`
- **Never hardcode tokens** - all secrets via env vars
- **Always check `userProfile?.company_id`** before Supabase queries (site isolation)
- **TypeScript strict mode is ON** - no implicit any
- Vite strips `console.log` in prod builds, but use logger anyway
