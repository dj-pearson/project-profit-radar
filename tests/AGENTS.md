# tests/ - End-to-End Tests

## Purpose
Playwright E2E tests that verify critical user journeys in a real browser.

## Structure
```
tests/
  e2e/
    smoke.spec.ts       # Quick sanity checks (homepage, auth page, 404)
    landing.spec.ts     # Landing page elements, SEO, performance
    navigation.spec.ts  # Route navigation, auth redirects, keyboard nav
    auth.spec.ts        # Authentication flows
    dashboard.spec.ts   # Dashboard rendering
```

## Conventions
- **Framework**: Playwright 1.56.1 with `@playwright/test`.
- **Browsers**: Chromium, Firefox, WebKit (CI runs Chromium only for speed).
- **Base URL**: `http://localhost:8080` (configured in `playwright.config.ts`).
- **File naming**: `<feature>.spec.ts`.

## Running Tests
```bash
npm run test:e2e              # All tests
npm run test:e2e:headed       # Visible browser
npm run test:e2e:debug        # Debug mode
npm run test:e2e:report       # View HTML report
```

## Writing Tests
```typescript
import { test, expect } from '@playwright/test';

test('descriptive name', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('text=Brikly')).toBeVisible();
});
```

## Pitfalls
- Tests assume the dev server is running on port 8080. Playwright config has `webServer` to start it automatically.
- Don't hardcode waits (`page.waitForTimeout`) — use Playwright's auto-waiting locators.
- For authenticated flows, login via the auth page rather than injecting tokens.
- Unit tests live in `src/**/__tests__/`, not here. This directory is E2E only.
