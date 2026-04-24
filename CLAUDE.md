# Brikly — Construction Management Platform

B2B SaaS for SMB construction companies. React + Supabase + Cloudflare Pages. ~95% complete, Phase 5 in progress.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.9, Vite 5.4 |
| Styling | Tailwind CSS 3.4, shadcn/ui, Radix UI |
| State | React Context + TanStack Query 5 |
| Routing | React Router DOM 6 |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Edge Functions) |
| Mobile | Capacitor 7 (iOS/Android) + Expo 54 (React Native) |
| Payments | Stripe |
| Accounting | QuickBooks Online (2-way sync) |
| Deploy | Cloudflare Pages |
| Testing | Vitest 4 (unit), Playwright 1.56 (E2E) |
| Monitoring | Sentry, PostHog, Web Vitals |

---

## Project Structure

```
src/
  components/     # 117+ domain-specific directories + ui/ (shadcn)
  pages/          # 262+ route pages
  contexts/       # AuthContext.tsx, ThemeContext.tsx
  hooks/          # Custom React hooks
  integrations/supabase/  # client.ts, types.ts, hooks
  lib/            # Core utilities, security, validation
  services/       # Business logic (ai/, analytics/)
  types/          # TypeScript type definitions
supabase/
  functions/      # 166+ Edge Functions (Deno)
  migrations/     # 369+ DB migrations
tests/e2e/        # Playwright tests
scripts/          # Build & automation scripts
android/          # Capacitor Android
ios/              # Capacitor iOS
mobile-native/    # Expo / React Native
```

**Key file paths:**
- Supabase client: `src/integrations/supabase/client.ts`
- Supabase types: `src/integrations/supabase/types.ts`
- Auth context: `src/contexts/AuthContext.tsx`
- Auth helpers (edge fns): `supabase/functions/_shared/auth-helpers.ts`
- UI components: `src/components/ui/`
- Utils: `src/lib/`, `src/utils/`
- Types: `src/types/`

---

## Common Commands

```bash
# Dev
npm run dev                    # port 8080
npm run build                  # production build
npm run build:analyze          # bundle analyzer

# Tests
npm run test:run               # Vitest once
npm run test:coverage          # coverage report
npm run test:e2e               # Playwright
npm run test:e2e:headed        # visible browser

# Quality
npm run lint
npm run lighthouse

# Mobile (Capacitor)
npm run mobile:sync            # sync web → native
npm run mobile:run:ios
npm run mobile:run:android

# Mobile (Expo)
npm run expo:start
npm run expo:build:android
npm run expo:build:ios
```

---

## User Roles

`admin` → `project_manager` → `field_supervisor` → `office_staff` → `accounting` → `client_portal`

Auth: Supabase Auth + SSO (SAML 2.0, OAuth 2.0) + MFA (TOTP, SMS, Email)

---

## Code Patterns

### Data Fetching (TanStack Query + Supabase)
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useProjects = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};
```

### Forms (react-hook-form + Zod)
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({ name: z.string().min(1).max(100) });
const form = useForm({ resolver: zodResolver(schema) });
```

### Error / Toast
```typescript
import { toast } from 'sonner';
try {
  await action();
  toast.success('Done');
} catch (error) {
  toast.error('Failed');
}
```

### Loading States
```typescript
import { Skeleton } from '@/components/ui/skeleton';
if (isLoading) return <Skeleton className="h-20" />;
if (error) return <div>Error: {error.message}</div>;
```

### Edge Function Auth Pattern
```typescript
const token = req.headers.get('Authorization')?.replace('Bearer ', '');
const { data: { user } } = await supabaseClient.auth.getUser(token);
// Apply RBAC + company_id RLS from here
```

### API Response Format
```typescript
{ success: boolean; data?: unknown; error?: string; timestamp: string; }
```

---

## Security Rules

1. **Never hardcode secrets** — always use environment variables (`.env` locally, Cloudflare/Supabase secrets in production)
2. **Validate all inputs** with Zod schemas
3. **Sanitize all outputs** with DOMPurify
4. **All tables use RLS** — rely on `company_id` isolation
5. **Audit everything** — critical actions must be logged

---

## Naming Conventions

| Type | Convention |
|------|-----------|
| Components | PascalCase |
| Hooks | `camelCase` with `use` prefix |
| Utils / functions | camelCase |
| Constants | UPPER_SNAKE_CASE |
| Branch names | `feature/`, `fix/`, `claude/<desc>-<sessionId>` |

Commits: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `test:`)

---

## Deployment

- **Production**: Cloudflare Pages (`npm ci && npm run build` → `dist/`)
- **Domain**: `brikly.net` + `brikly.pearsonperformance.workers.dev`
- **Node**: 18+, Package manager: npm 10.9.2
- **Env vars** (Cloudflare): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `STRIPE_PUBLISHABLE_KEY`
- **Edge function secrets**: Managed in Supabase dashboard

---

## Known Priorities

1. Accessibility: ~2% of pages implemented — see `docs/ACCESSIBILITY_COMPLIANCE_CHECKLIST.md`
2. Test coverage: currently ~10%, target 60%+
3. Offline sync: more robust mobile queue needed
4. Bundle size: target <800KB gzipped

---

*Keep this file concise. For deep reference: `docs/`, `PHASE4_COMPLETE_SUMMARY.md`, AGENTS.md files per directory.*
