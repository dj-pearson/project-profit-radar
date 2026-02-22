# src/ - Source Code Root

## Purpose
Main application source for the BuildDesk construction management SaaS platform.

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
- `lib/logger.ts` - Production-safe logger (use instead of console.log)
- `lib/utils.ts` - Core utilities (cn, formatCurrency)

## Common Pitfalls
- **Never use bare `console.log`** - use `logger` from `@/lib/logger`
- **Never hardcode tokens** - all secrets via env vars
- **Always check `userProfile?.company_id`** before Supabase queries (site isolation)
- **TypeScript strict mode is ON** - no implicit any
- Vite strips `console.log` in prod builds, but use logger anyway
