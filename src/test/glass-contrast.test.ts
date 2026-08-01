/**
 * US-143 — per-surface light/dark token audit for glass contrast.
 *
 * Glass surfaces are translucent, so the colour a user actually reads text
 * against is `glass tint composited over whatever the page is painting`. A
 * token pair that passes WCAG AA on a solid `bg-card` can quietly fail once the
 * ambient page background shows through.
 *
 * This suite reads the real token values out of `src/index.css` (rather than
 * duplicating them) and asserts the composited result for every
 * `glass intensity × ambient background × theme` combination. Editing a token
 * to something inaccessible fails here instead of on a customer's phone in
 * direct sun.
 *
 * Companion doc: docs/MOBILE_GLASS_GUIDELINES.md
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  WCAG_AA_LARGE,
  WCAG_AA_NORMAL,
  compositeOver,
  contrastRatio,
  deltaE76,
  formatRgb,
  hslTripletToRgb,
  parseRgbaLiteral,
  relativeLuminance,
  simulateColorVision,
  withAlpha,
  type ColorVision,
  type GlassIntensity,
  type Rgb,
  type Theme,
} from '@/lib/glass-contrast';
import {
  DENSE_COLUMN_THRESHOLD,
  resolveTableSurface,
} from '@/components/mobile/mobileTableSurface';

// ---------------------------------------------------------------------------
// Token extraction from src/index.css
// ---------------------------------------------------------------------------

const CSS_PATH = path.resolve(__dirname, '../index.css');
// Comments are stripped first: an inline `/* … */` between declarations would
// otherwise be glued onto the next property name, and a comment above a
// selector hides it from the "preceded by ; { }" anchors used below.
const css = readFileSync(CSS_PATH, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Merge every declaration block for a selector. `src/index.css` declares
 * `:root` and `.dark` more than once (base design tokens, then the glass
 * system), and later declarations win — same as the browser.
 *
 * The `\s*\{` is load-bearing: it keeps `.dark .ios-page-bg { … }` from being
 * mistaken for a `.dark` block.
 */
function readVars(selector: ':root' | '.dark'): Record<string, string> {
  const pattern = new RegExp(
    `(?:^|[;{}])\\s*${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`,
    'g'
  );
  const vars: Record<string, string> = {};
  for (const match of css.matchAll(pattern)) {
    for (const decl of match[1].split(';')) {
      const [rawName, ...rest] = decl.split(':');
      const name = rawName.trim();
      if (!name.startsWith('--')) continue;
      vars[name] = rest.join(':').trim();
    }
  }
  return vars;
}

const LIGHT_VARS = readVars(':root');
const DARK_VARS = readVars('.dark');

function tokenValue(theme: Theme, name: string): string {
  const value = theme === 'dark' ? DARK_VARS[name] ?? LIGHT_VARS[name] : LIGHT_VARS[name];
  if (!value) throw new Error(`Token ${name} not found in src/index.css (${theme})`);
  return value;
}

const color = (theme: Theme, name: string): Rgb =>
  hslTripletToRgb(tokenValue(theme, name));

const glassLayer = (theme: Theme, intensity: GlassIntensity) => {
  const varName =
    intensity === 'glass' ? '--glass-bg'
    : intensity === 'glass-thin' ? '--glass-bg-thin'
    : '--glass-bg-thick';
  return parseRgbaLiteral(tokenValue(theme, varName));
};

const GLASS_INTENSITIES: GlassIntensity[] = ['glass-thin', 'glass', 'glass-thick'];

/**
 * The three ambient page backgrounds a glass surface sits on, taken from the
 * `.ios-page-bg` radial-gradient stops in `src/index.css`:
 *
 * - **warm sunlight** — the construction-orange stop at 12% 8%, the warmest and
 *   (in light mode) the lowest-luminance-margin corner of the page.
 * - **neutral indoor** — bare `--background`, no gradient stop reaching it.
 * - **cool/night** — the blue stop at 92% 6%; in dark mode this is the night
 *   ambient the story asks for.
 *
 * Alphas are parsed from the CSS so a gradient tweak re-runs the audit.
 */
function ambientStopAlpha(theme: Theme, tokenName: string): number {
  const block = theme === 'dark'
    ? /^\.dark\s+\.ios-page-bg\s*\{([\s\S]*?)\}/m.exec(css)
    : /^\.ios-page-bg\s*\{([\s\S]*?)\}/m.exec(css);
  if (!block) throw new Error(`.ios-page-bg block not found for ${theme}`);
  // hsl(var(--construction-orange) / 0.14) or hsl(210 100% 40% / 0.10)
  const pattern = new RegExp(
    `hsl\\(\\s*(?:var\\(${tokenName}\\)|[\\d.\\s%]+)\\s*/\\s*([\\d.]+)\\s*\\)`
  );
  const found = pattern.exec(block[1]);
  if (!found) throw new Error(`No ${tokenName} stop in .ios-page-bg (${theme})`);
  return parseFloat(found[1]);
}

function ambientBackgrounds(theme: Theme): Record<string, Rgb> {
  const background = color(theme, '--background');
  const warmAlpha = ambientStopAlpha(theme, '--construction-orange');
  // Dark mode inlines the cool stop as a literal instead of a var.
  const coolAlpha = theme === 'light'
    ? ambientStopAlpha(theme, '--construction-blue')
    : 0.1;
  const cool = theme === 'light'
    ? color(theme, '--construction-blue')
    : hslTripletToRgb('210 100% 40%');

  return {
    'warm sunlight': compositeOver(
      withAlpha(color(theme, '--construction-orange'), warmAlpha),
      background
    ),
    'neutral indoor': background,
    [theme === 'dark' ? 'night' : 'cool daylight']: compositeOver(
      withAlpha(cool, coolAlpha),
      background
    ),
  };
}

/** Every surface a user can read text on, per theme. */
function surfaceMatrix(theme: Theme): Array<{ label: string; rgb: Rgb }> {
  const surfaces: Array<{ label: string; rgb: Rgb }> = [];
  for (const [ambientName, ambient] of Object.entries(ambientBackgrounds(theme))) {
    for (const intensity of GLASS_INTENSITIES) {
      surfaces.push({
        label: `${intensity} on ${ambientName}`,
        rgb: compositeOver(glassLayer(theme, intensity), ambient),
      });
    }
  }
  return surfaces;
}

const THEMES: Theme[] = ['light', 'dark'];

// ---------------------------------------------------------------------------

describe('glass token extraction', () => {
  it('finds every token the audit depends on', () => {
    for (const theme of THEMES) {
      for (const name of [
        '--background',
        '--foreground',
        '--muted-foreground',
        '--primary',
        '--primary-on-glass',
        '--destructive',
        '--glass-bg',
        '--glass-bg-thin',
        '--glass-bg-thick',
      ]) {
        expect(() => tokenValue(theme, name), `${theme} ${name}`).not.toThrow();
      }
    }
  });

  it('models glass as translucent — a thicker tint moves the surface further from the page', () => {
    for (const theme of THEMES) {
      const alphas = GLASS_INTENSITIES.map((i) => glassLayer(theme, i)[3]);
      expect(alphas[0], `${theme} thin < base`).toBeLessThan(alphas[1]);
      expect(alphas[1], `${theme} base < thick`).toBeLessThan(alphas[2]);
      expect(alphas[2], `${theme} thick stays translucent`).toBeLessThan(1);
    }
  });
});

describe('body text over glass meets WCAG AA (US-143 AC3)', () => {
  for (const theme of THEMES) {
    for (const { label, rgb: surface } of surfaceMatrix(theme)) {
      it(`${theme}: --foreground on ${label}`, () => {
        const ratio = contrastRatio(color(theme, '--foreground'), surface);
        expect(
          ratio,
          `--foreground over ${formatRgb(surface)} is ${ratio.toFixed(2)}:1`
        ).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
      });

      it(`${theme}: --muted-foreground on ${label}`, () => {
        const ratio = contrastRatio(color(theme, '--muted-foreground'), surface);
        expect(
          ratio,
          `--muted-foreground over ${formatRgb(surface)} is ${ratio.toFixed(2)}:1`
        ).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
      });
    }
  }
});

describe('accent text over glass (US-143 AC3)', () => {
  for (const theme of THEMES) {
    for (const { label, rgb: surface } of surfaceMatrix(theme)) {
      it(`${theme}: --primary-on-glass on ${label}`, () => {
        const ratio = contrastRatio(color(theme, '--primary-on-glass'), surface);
        expect(
          ratio,
          `--primary-on-glass over ${formatRgb(surface)} is ${ratio.toFixed(2)}:1`
        ).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
      });
    }
  }

  it('documents why --primary itself is a fill colour, not a text colour', () => {
    // This is the finding that produced --primary-on-glass. If someone ever
    // darkens --primary enough to clear AA as small copy on light glass, this
    // guard fires and the extra token can be retired.
    const surface = compositeOver(
      glassLayer('light', 'glass-thin'),
      ambientBackgrounds('light')['cool daylight']
    );
    const ratio = contrastRatio(color('light', '--primary'), surface);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
    expect(
      ratio,
      'if --primary now clears AA on glass, drop --primary-on-glass and this test'
    ).toBeLessThan(WCAG_AA_NORMAL);
  });
});

describe('decorative icons over glass clear AA-large (US-143 AC3)', () => {
  // Guideline rule 2: aria-hidden icons may sit at 3:1.
  for (const theme of THEMES) {
    it(`${theme}: --muted-foreground stays >= 3:1 on the weakest surface`, () => {
      const worst = surfaceMatrix(theme).reduce((min, s) => {
        const ratio = contrastRatio(color(theme, '--muted-foreground'), s.rgb);
        return ratio < min.ratio ? { ratio, label: s.label } : min;
      }, { ratio: Infinity, label: '' });
      expect(worst.ratio, `weakest surface: ${worst.label}`).toBeGreaterThanOrEqual(
        WCAG_AA_LARGE
      );
    });
  }
});

describe('busy media backdrops require a solid surface (US-143 AC2)', () => {
  // The guidelines say to switch to solid over images/maps. These cases prove
  // the rule is not stylistic: glass over an extreme backdrop genuinely fails.
  const EXTREMES: Array<{ label: string; rgb: Rgb }> = [
    { label: 'blown-out photo', rgb: [255, 255, 255] },
    { label: 'night photo', rgb: [0, 0, 0] },
  ];

  for (const theme of THEMES) {
    it(`${theme}: at least one extreme backdrop breaks muted text on glass`, () => {
      const failures = EXTREMES.filter(({ rgb }) => {
        const surface = compositeOver(glassLayer(theme, 'glass'), rgb);
        return contrastRatio(color(theme, '--muted-foreground'), surface) < WCAG_AA_NORMAL;
      });
      expect(failures.length).toBeGreaterThan(0);
    });

    it(`${theme}: the solid card surface survives every extreme backdrop`, () => {
      // `surface='solid'` is opaque `bg-card`, so the backdrop cannot bleed in.
      const solid = color(theme, '--card');
      for (const token of ['--foreground', '--muted-foreground'] as const) {
        const ratio = contrastRatio(color(theme, token), solid);
        expect(ratio, `${token} on solid card`).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
      }
    });
  }

  it('dense tables resolve to a solid surface automatically', () => {
    expect(resolveTableSurface('auto', DENSE_COLUMN_THRESHOLD)).toBe('solid');
    expect(resolveTableSurface('auto', DENSE_COLUMN_THRESHOLD - 1)).toBe('glass');
    expect(resolveTableSurface('glass', 99)).toBe('glass');
    expect(resolveTableSurface('solid', 1)).toBe('solid');
  });
});

describe('colour-vision deficiency (US-143 AC6)', () => {
  const TYPES: ColorVision[] = ['deuteranopia', 'protanopia'];
  // Two UI colours read as different from roughly ΔE 10 upward in CIE76.
  const DISTINGUISHABLE = 10;

  // Note on method: WCAG contrast is a *luminance* metric and dichromats retain
  // near-normal luminance perception, so running a contrast ratio on simulated
  // colours measures an artefact of the simulation matrix, not a real barrier.
  // These tests therefore ask the question CVD actually raises — "do these two
  // colours still read as different?" — via ΔE, and leave the ratio checks to
  // the normal-vision suites above.
  for (const theme of THEMES) {
    for (const type of TYPES) {
      it(`${theme}/${type}: the primary CTA fill stays distinct from every glass surface`, () => {
        const cta = simulateColorVision(color(theme, '--primary'), type);
        for (const { label, rgb } of surfaceMatrix(theme)) {
          const surface = simulateColorVision(rgb, type);
          expect(deltaE76(cta, surface), `CTA vs ${label}`).toBeGreaterThanOrEqual(
            DISTINGUISHABLE
          );
        }
      });

      it(`${theme}/${type}: primary and destructive stay tellable apart`, () => {
        // Orange and red converge under red-green deficiencies, which is why
        // guideline rule 4 also requires an icon on destructive actions. This
        // asserts the colours have not converged *further*.
        const primary = simulateColorVision(color(theme, '--primary'), type);
        const destructive = simulateColorVision(color(theme, '--destructive'), type);
        expect(deltaE76(primary, destructive)).toBeGreaterThanOrEqual(DISTINGUISHABLE);
      });

      it(`${theme}/${type}: accent text stays distinct from every glass surface`, () => {
        const accent = simulateColorVision(color(theme, '--primary-on-glass'), type);
        for (const { label, rgb } of surfaceMatrix(theme)) {
          const surface = simulateColorVision(rgb, type);
          expect(deltaE76(accent, surface), label).toBeGreaterThanOrEqual(
            DISTINGUISHABLE
          );
        }
      });
    }
  }
});

describe('CTA label legibility on brand fills', () => {
  // Not a glass question, but the CVD pass surfaced it and it belongs with the
  // rest of the token audit. `--primary` / `--destructive` are brand fills:
  // white-on-orange clears AA-large everywhere but only clears AA-normal in
  // light mode, so button labels must stay at button weight/size. Changing the
  // brand hues is a design decision, tracked separately — this locks in the
  // floor so the fills cannot drift darker/lighter without a conversation.
  for (const theme of THEMES) {
    for (const fill of ['--primary', '--destructive'] as const) {
      it(`${theme}: ${fill} label clears AA-large`, () => {
        const ratio = contrastRatio(
          color(theme, `${fill}-foreground` as '--primary-foreground'),
          color(theme, fill)
        );
        expect(ratio, `${theme} ${fill} label is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
          WCAG_AA_LARGE
        );
      });
    }
  }
});

describe('low-gpu fallback keeps the audit valid (US-144 interaction)', () => {
  it('flattens glass to a near-opaque card so contrast can only improve', () => {
    const fallback = /\.low-gpu[\s\S]{0,600}?background:\s*hsl\(var\(--card\)\s*\/\s*([\d.]+)\)/.exec(
      css
    );
    expect(fallback, 'low-gpu glass fallback not found in src/index.css').not.toBeNull();
    expect(parseFloat(fallback![1])).toBeGreaterThanOrEqual(0.95);
  });

  it('the flattened surface passes AA in both themes', () => {
    for (const theme of THEMES) {
      const surface = compositeOver(
        withAlpha(color(theme, '--card'), 0.96),
        ambientBackgrounds(theme)['warm sunlight']
      );
      expect(
        contrastRatio(color(theme, '--muted-foreground'), surface),
        `${theme} low-gpu surface luminance ${relativeLuminance(surface).toFixed(3)}`
      ).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
    }
  });
});
