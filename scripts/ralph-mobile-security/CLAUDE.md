# Ralph Agent Instructions - Mobile & Auth Security

You are an autonomous coding agent working on the BuildDesk construction management platform.

## Your Task

1. Read the PRD at `scripts/ralph-mobile-security/prd.json`
2. Read the progress log at `scripts/ralph-mobile-security/progress.txt` (check Codebase Patterns section first)
3. Check you're on the correct branch from PRD `branchName`. If not, check it out or create from main.
4. Pick the **highest priority** user story where `passes: false`
5. Implement that single user story
6. Run quality checks: `npm run build` (TypeScript compile check) and `npm run lint`
7. If checks pass, commit ALL changes with message: `feat: [Story ID] - [Story Title]`
8. Update the PRD to set `passes: true` for the completed story
9. Append your progress to `scripts/ralph-mobile-security/progress.txt`

## Project Context

- **Stack**: React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Realtime)
- **State**: React Context (auth/theme) + TanStack Query (server state)
- **Routing**: React Router DOM 6
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Payments**: Stripe
- **Mobile**: Capacitor 7 (iOS/Android) + Native SwiftUI iOS app + Expo React Native
- **Deploy**: Cloudflare Pages

## Key Paths

- Supabase client: `src/integrations/supabase/client.ts`
- Supabase types: `src/integrations/supabase/types.ts`
- Auth context: `src/contexts/AuthContext.tsx`
- Auth forms: `src/components/auth/SignInForm.tsx`, `src/components/auth/SignUpForm.tsx`
- Auth page: `src/pages/Auth.tsx`
- Security utilities: `src/lib/security/`
- CSRF protection: `src/lib/security/csrfProtection.ts` + `src/lib/security/csrfProtection.tsx`
- Login protection: `src/lib/security/loginProtection.ts`
- Rate limiter: `src/lib/security/rateLimiter.ts`
- UI components: `src/components/ui/` (shadcn/ui)
- Mobile components: `src/components/mobile/`
- Mobile services: `src/mobile/services/`
- Utils: `src/lib/utils.ts` (`cn()` helper)
- Import alias: `@/` maps to `src/`
- Edge functions: `supabase/functions/`
- Secure CORS: `supabase/functions/_shared/secure-cors.ts`
- Rate limiter (server): `supabase/functions/_shared/rate-limiter.ts`

## Quality Checks

Run these in order - ALL must pass before committing:

```bash
npm run build        # TypeScript compile + Vite build (primary check)
npm run lint         # ESLint
```

Do NOT run `npm run test:run` as part of the standard check — there are pre-existing test failures.

## Progress Report Format

APPEND to `scripts/ralph-mobile-security/progress.txt` (never replace, always append):

```
## [Date/Time] - [Story ID]
- What was implemented
- Files changed
- **Learnings for future iterations:**
  - Patterns discovered
  - Gotchas encountered
  - Useful context
---
```

## Consolidate Patterns

If you discover a **reusable pattern**, add it to the `## Consolidated Patterns` section at the TOP of `scripts/ralph-mobile-security/progress.txt`.

## Stop Condition

After completing a user story, check if ALL stories have `passes: true`.

If ALL stories are complete, reply with:
 COMPLETE

If there are still stories with `passes: false`, end your response normally.

## Important

- Work on **ONE story per iteration**
- Keep CI green — do not commit broken code
- Keep changes focused and minimal
- Follow existing code patterns in the codebase
- Never use hardcoded secrets
- Read progress.txt Consolidated Patterns before starting
