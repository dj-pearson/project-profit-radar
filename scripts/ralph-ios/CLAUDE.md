# Ralph Agent Instructions

You are an autonomous coding agent working on the Brikly construction management platform.

## Your Task

1. Read the PRD at `scripts/ralph-ios/prd.json`
2. Read the progress log at `scripts/ralph-ios/progress.txt` (check Codebase Patterns section first)
3. Check you're on the correct branch from PRD `branchName`. If not, check it out or create from main.
4. Pick the **highest priority** user story where `passes: false`
5. Implement that single user story
6. Run quality checks: `npm run build` (TypeScript compile check) and `npm run lint`
7. Update CLAUDE.md files if you discover reusable patterns (see below)
8. If checks pass, commit ALL changes with message: `feat: [Story ID] - [Story Title]`
9. Update the PRD to set `passes: true` for the completed story
10. Append your progress to `scripts/ralph-ios/progress.txt`

## Project Context

- **Stack**: React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Realtime)
- **State**: React Context (auth/theme) + TanStack Query (server state)
- **Routing**: React Router DOM 6
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Payments**: Stripe
- **Mobile**: Capacitor 7 (iOS/Android) + Native SwiftUI iOS app at `Brikly-iOS/`
- **Deploy**: Cloudflare Pages

## iOS-Specific Context

- **iOS App Location**: `Brikly-iOS/Brikly/` - Native SwiftUI app
- **Architecture**: MVVM with `@Observable` macro and `@MainActor`
- **Services**: `Brikly-iOS/Brikly/Services/` - Supabase service layer
- **Views**: `Brikly-iOS/Brikly/Views/` - SwiftUI views
- **ViewModels**: `Brikly-iOS/Brikly/ViewModels/` - Observable view models
- **Models**: `Brikly-iOS/Brikly/Models/` - Codable data models
- **Xcode Project**: `Brikly-iOS/Brikly.xcodeproj/project.pbxproj`
- **Capacitor Config**: `capacitor.config.ts`
- **Mobile Vite Config**: `vite.config.mobile.ts`
- **Edge Functions**: `supabase/functions/` - Shared between web and iOS

## Key Paths

- Supabase client: `src/integrations/supabase/client.ts`
- Supabase types: `src/integrations/supabase/types.ts`
- Auth context: `src/contexts/AuthContext.tsx`
- UI components: `src/components/ui/` (shadcn/ui)
- Utils: `src/lib/utils.ts` (`cn()` helper)
- Import alias: `@/` maps to `src/`
- Edge functions: `supabase/functions/`
- DB migrations: `supabase/migrations/`
- Secure CORS: `supabase/functions/_shared/secure-cors.ts`
- Rate limiter: `supabase/functions/_shared/rate-limiter.ts`

## Quality Checks

Run these in order - ALL must pass before committing:

```bash
npm run build        # TypeScript compile + Vite build (primary check)
npm run lint         # ESLint
```

Do NOT run `npm run test:run` as part of the standard check — there are pre-existing test failures that are tracked separately. Only run tests if the story explicitly requires it.

For Swift changes, verify syntax is correct but do not attempt to compile (no Xcode in CI).

## Progress Report Format

APPEND to `scripts/ralph-ios/progress.txt` (never replace, always append):

```
## [Date/Time] - [Story ID]
- What was implemented
- Files changed
- **Learnings for future iterations:**
  - Patterns discovered (e.g., "this codebase uses X for Y")
  - Gotchas encountered (e.g., "don't forget to update Z when changing W")
  - Useful context (e.g., "the evaluation panel is in component X")
---
```

The learnings section is critical - it helps future iterations avoid repeating mistakes and understand the codebase better.

## Consolidate Patterns

If you discover a **reusable pattern** that future iterations should know, add it to the `## Consolidated Patterns` section at the TOP of `scripts/ralph-ios/progress.txt`. This section should consolidate the most important learnings.

Only add patterns that are **general and reusable**, not story-specific details.

## Stop Condition

After completing a user story, check if ALL stories have `passes: true`.

If ALL stories are complete and passing, reply with:
 COMPLETE

If there are still stories with `passes: false`, end your response normally (another iteration will pick up the next story).

## Important

- Work on **ONE story per iteration**
- Keep CI green — do not commit broken code
- Keep changes focused and minimal
- Follow existing code patterns in the codebase
- Never use hardcoded secrets — all secrets must reference environment variables
- Read `scripts/ralph-ios/progress.txt` Consolidated Patterns before starting
- When editing `project.pbxproj`, use unique IDs that don't conflict with existing entries (prefix with AB0001xx for files, AE0001xx for build file refs)
