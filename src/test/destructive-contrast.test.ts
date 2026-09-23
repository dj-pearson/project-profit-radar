/**
 * US-410: --destructive is split into a fill and a text token.
 *
 * `bg-destructive` (+ `text-destructive-foreground` label) reads --destructive;
 * `text-destructive` reads --destructive-text via the textColor override in
 * tailwind.config.ts. This suite reads both from src/index.css and holds the
 * AA floor for every surface text-destructive is drawn on, the white label on
 * the fill, and the colour-vision separation from --primary that sank the
 * first attempt (0 84.2% 45% converged with orange to deltaE 2.71).
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  WCAG_AA_NORMAL,
  compositeOver,
  contrastRatio,
  deltaE76,
  hslTripletToRgb,
  simulateColorVision,
  withAlpha,
  type Rgb,
  type Theme,
} from '@/lib/glass-contrast';

const css = readFileSync(path.resolve(__dirname, '../index.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  ''
);

function readVars(selector: string): Record<string, string> {
  const pattern = new RegExp(
    `(?:^|[;{}])\\s*${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`,
    'g'
  );
  const vars: Record<string, string> = {};
  for (const match of css.matchAll(pattern)) {
    for (const decl of match[1].split(';')) {
      const [rawName, ...rest] = decl.split(':');
      const name = rawName.trim();
      if (name.startsWith('--')) vars[name] = rest.join(':').trim();
    }
  }
  return vars;
}

const VARS: Record<Theme, Record<string, string>> = {
  light: readVars(':root'),
  dark: { ...readVars(':root'), ...readVars('.dark') },
};

function color(theme: Theme, name: string): Rgb {
  const value = VARS[theme][name];
  if (!value) throw new Error(`${name} missing from src/index.css (${theme})`);
  return hslTripletToRgb(value);
}

const THEMES: Theme[] = ['light', 'dark'];
const DISTINGUISHABLE = 10;

/** Every surface text-destructive is drawn on in shipped UI. */
function textSurfaces(theme: Theme): Array<[string, Rgb]> {
  const background = color(theme, '--background');
  const fill = color(theme, '--destructive');
  return [
    ['--background', background],
    ['--card', color(theme, '--card')],
    ['--popover', color(theme, '--popover')],
    ['--muted', color(theme, '--muted')],
    // Alert / error banners: bg-destructive/5 .. /20 behind text-destructive.
    ['bg-destructive/10', compositeOver(withAlpha(fill, 0.1), background)],
    ['bg-destructive/20', compositeOver(withAlpha(fill, 0.2), background)],
  ];
}

describe('text-destructive meets AA (US-410 AC2)', () => {
  it('tailwind routes text-destructive to --destructive-text', () => {
    const config = readFileSync(path.resolve(__dirname, '../../tailwind.config.ts'), 'utf8');
    expect(config).toMatch(
      /textColor:\s*\{\s*destructive:\s*\{\s*DEFAULT:\s*'hsl\(var\(--destructive-text\)\)'/
    );
  });

  for (const theme of THEMES) {
    for (const [label, surface] of textSurfaces(theme)) {
      it(`${theme}: --destructive-text on ${label}`, () => {
        const ratio = contrastRatio(color(theme, '--destructive-text'), surface);
        expect(ratio, `${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
      });
    }
  }
});

describe('destructive button label (US-410 AC4)', () => {
  for (const theme of THEMES) {
    it(`${theme}: --destructive-foreground on --destructive clears AA-normal`, () => {
      const ratio = contrastRatio(
        color(theme, '--destructive-foreground'),
        color(theme, '--destructive')
      );
      expect(ratio, `${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
    });
  }

  it('dark: the fill keeps the 9.58:1 label it had before the split', () => {
    const ratio = contrastRatio(
      color('dark', '--destructive-foreground'),
      color('dark', '--destructive')
    );
    expect(ratio).toBeGreaterThanOrEqual(9.5);
  });
});

describe('destructive vs --primary under red-green deficiency (US-410 AC3)', () => {
  for (const theme of THEMES) {
    for (const token of ['--destructive', '--destructive-text']) {
      for (const type of ['deuteranopia', 'protanopia'] as const) {
        it(`${theme}/${type}: ${token} stays apart from --primary`, () => {
          const d = deltaE76(
            simulateColorVision(color(theme, token), type),
            simulateColorVision(color(theme, '--primary'), type)
          );
          expect(d, `deltaE76 ${d.toFixed(2)}`).toBeGreaterThanOrEqual(DISTINGUISHABLE);
        });
      }
    }
  }
});
