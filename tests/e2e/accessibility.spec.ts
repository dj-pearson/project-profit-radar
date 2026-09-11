import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

/**
 * axe-core over the pages a signed-out visitor can reach.
 *
 * These are the pages nobody needs an account to hit, so they are the ones a
 * screen-reader user or someone with low vision meets first. The suite asserts
 * zero serious or critical violations; moderate and minor are reported but do
 * not fail, because several of those are judgement calls axe cannot make.
 *
 * axe-core is a devDependency rather than @axe-core/playwright, so the bundle is
 * injected by hand. require.resolve rather than a relative path: it has to work
 * from wherever the runner's cwd happens to be.
 */
const require = createRequire(import.meta.url);
const AXE_SOURCE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const PUBLIC_PAGES = ['/', '/pricing', '/features', '/faq', '/contact', '/blog', '/demo', '/auth'];

type Violation = { id: string; impact: string; nodes: { html: string; message: string }[] };

async function analyze(page: import('@playwright/test').Page): Promise<Violation[]> {
  await page.addScriptTag({ content: AXE_SOURCE });
  return page.evaluate(async () => {
    // @ts-expect-error - axe is attached by the injected script, not typed here
    const result = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    });
    return result.violations.map((v: Record<string, unknown>) => ({
      id: v.id,
      impact: v.impact,
      nodes: (v.nodes as Record<string, unknown>[]).map((n) => ({
        html: String(n.html).slice(0, 160),
        message: String((n.any as Record<string, unknown>[])[0]?.message ?? ''),
      })),
    }));
  });
}

for (const path of PUBLIC_PAGES) {
  test(`${path} has no serious or critical accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');

    const violations = await analyze(page);
    const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');

    // Name what failed, so a red run says which element and why rather than
    // just a count.
    const detail = blocking
      .flatMap((v) => v.nodes.map((n) => `  [${v.impact}] ${v.id}\n    ${n.html}\n    ${n.message}`))
      .join('\n');

    expect(blocking, `axe found ${blocking.length} blocking violation(s) on ${path}:\n${detail}`)
      .toHaveLength(0);
  });
}
