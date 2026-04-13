# Ralph Agent Instructions — Android App Audit

You are an autonomous coding agent working on the Brikly Android app (Capacitor-based).

## Your Task

1. Read the PRD at `scripts/ralph-android/prd.json`
2. Read the progress log at `scripts/ralph-android/progress.txt` (check Consolidated Patterns first)
3. Check you're on the correct branch from PRD `branchName`. If not, check it out or create from main.
4. Pick the **highest priority** user story where `passes: false`
5. Implement that single user story
6. Run quality checks: `npm run build` (TypeScript compile check)
7. If checks pass, commit ALL changes with message: `feat: [Story ID] - [Story Title]`
8. Update the PRD to set `passes: true` for the completed story
9. Append your progress to `scripts/ralph-android/progress.txt`

## Project Context

- **Stack**: React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Realtime)
- **Mobile**: Capacitor 7.4.4 (native Android/iOS wrapper for web app)
- **Android**: Gradle, Java 17, SDK 23-35, com.brikly.app
- **Deploy**: Cloudflare Pages (web), Google Play Store (Android)

## Android-Specific Context

- **Android project**: `android/` directory (tracked in git, not gitignored)
- **Capacitor config**: `capacitor.config.ts` (app ID, plugins, server settings)
- **Mobile Vite config**: `vite.config.mobile.ts` (outputs to `dist-mobile/`)
- **Mobile build**: `npm run build:mobile` then `npx cap sync android`
- **Main activity**: `android/app/src/main/java/com/brikly/app/MainActivity.java`
- **Manifest**: `android/app/src/main/AndroidManifest.xml`
- **Build config**: `android/app/build.gradle`
- **ProGuard**: `android/app/proguard-rules.pro`
- **Resources**: `android/app/src/main/res/` (values, xml, drawable, mipmap)
- **Fastlane**: `android/fastlane/metadata/android/en-US/` (Play Store metadata)

### Mobile Components (Capacitor/Web)

- **Permission manager**: `src/components/mobile/AndroidPermissionManager.tsx`
- **Back button hook**: `src/hooks/useAndroidBackButton.ts`
- **Status bar hook**: `src/hooks/useAndroidStatusBar.ts`
- **Mobile components**: `src/components/mobile/` (42+ components)
- **Mobile services**: `src/mobile/services/` (background, permissions)
- **Offline sync**: `src/lib/offline-sync.ts`
- **Touch utilities**: `src/lib/mobile-touch.ts`

### Installed Capacitor Plugins

@capacitor/app, @capacitor/camera, @capacitor/core, @capacitor/device,
@capacitor/filesystem, @capacitor/geolocation, @capacitor/local-notifications,
@capacitor/network, @capacitor/preferences, @capacitor/push-notifications,
@capacitor/status-bar

## Key Paths

- Supabase client: `src/integrations/supabase/client.ts`
- Auth context: `src/contexts/AuthContext.tsx`
- Theme context: `src/contexts/ThemeContext.tsx`
- UI components: `src/components/ui/` (shadcn/ui)
- Security utilities: `src/lib/security/`
- Import alias: `@/` maps to `src/`

## Quality Checks

Run these before committing — build must pass:

```bash
npm run build        # TypeScript compile + Vite build (primary check)
```

Do NOT run `npm run test:run` — there are pre-existing test failures tracked separately. Do NOT run `npm run lint` — there are pre-existing lint errors unrelated to Android work.

## Progress Report Format

APPEND to `scripts/ralph-android/progress.txt` (never replace, always append):

```
### AA-XXX: Title [DONE]
- What was implemented
- Files changed
- Key decisions or gotchas
```

## Stop Condition

After completing a user story, check if ALL stories have `passes: true`.

If ALL stories are complete: reply with  COMPLETE 

If stories remain with `passes: false`: end normally (next iteration picks up).

## Important

- Work on **ONE story per iteration**
- Keep CI green — do not commit broken code
- Keep changes focused and minimal
- Follow existing code patterns in the codebase
- Android native files (Java/XML) must be well-commented
- Never commit secrets — use environment variables or Gradle properties
- Read `scripts/ralph-android/progress.txt` Consolidated Patterns before starting
