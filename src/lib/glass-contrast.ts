/**
 * Glass-surface contrast math (US-143).
 *
 * The iOS glass design system layers a translucent tint over whatever the page
 * is painting underneath. That means a token pair that passes WCAG AA on a
 * solid `bg-card` can quietly fail once it is composited over a busy ambient
 * background. These helpers make that composite step explicit so it can be
 * asserted in a unit test (`src/test/glass-contrast.test.ts`) instead of being
 * eyeballed per screen.
 *
 * Everything here is pure colour math — no DOM, no Tailwind runtime. The token
 * values themselves are parsed out of `src/index.css` by the test so the test
 * fails if someone edits a token to something inaccessible.
 */

export type Rgb = readonly [number, number, number];
export type Rgba = readonly [number, number, number, number];
export type Theme = 'light' | 'dark';

/** Glass intensities defined in `src/index.css`. */
export type GlassIntensity = 'glass-thin' | 'glass' | 'glass-thick';

/** WCAG 2.1 AA thresholds. */
export const WCAG_AA_NORMAL = 4.5;
export const WCAG_AA_LARGE = 3;

const clamp255 = (n: number) => Math.min(255, Math.max(0, n));

/**
 * Parse a Tailwind-style HSL triplet (`"215 25% 27%"`, as stored in the CSS
 * custom properties) into RGB. Also accepts a full `hsl(...)` wrapper.
 */
export function hslTripletToRgb(triplet: string): Rgb {
  const cleaned = triplet.trim().replace(/^hsla?\(/, '').replace(/\)$/, '');
  const parts = cleaned.split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) {
    throw new Error(`Not an HSL triplet: "${triplet}"`);
  }
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  if ([h, s, l].some((n) => Number.isNaN(n))) {
    throw new Error(`Not an HSL triplet: "${triplet}"`);
  }

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1 ? [c, x, 0] :
    hp < 2 ? [x, c, 0] :
    hp < 3 ? [0, c, x] :
    hp < 4 ? [0, x, c] :
    hp < 5 ? [x, 0, c] :
    [c, 0, x];
  const m = l - c / 2;
  return [
    Math.round(clamp255((r1 + m) * 255)),
    Math.round(clamp255((g1 + m) * 255)),
    Math.round(clamp255((b1 + m) * 255)),
  ];
}

/** Parse an `rgba(r, g, b, a)` / `rgb(r, g, b)` literal into RGBA. */
export function parseRgbaLiteral(literal: string): Rgba {
  const match = /rgba?\(([^)]+)\)/i.exec(literal.trim());
  if (!match) {
    throw new Error(`Not an rgb/rgba literal: "${literal}"`);
  }
  const parts = match[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`Not an rgb/rgba literal: "${literal}"`);
  }
  return [clamp255(parts[0]), clamp255(parts[1]), clamp255(parts[2]), parts[3] ?? 1];
}

/** Attach an alpha channel to an opaque colour. */
export function withAlpha(rgb: Rgb, alpha: number): Rgba {
  return [rgb[0], rgb[1], rgb[2], alpha];
}

/** Composite a translucent layer over an opaque backdrop (simple source-over). */
export function compositeOver(layer: Rgba, backdrop: Rgb): Rgb {
  const a = Math.min(1, Math.max(0, layer[3]));
  return [
    Math.round(layer[0] * a + backdrop[0] * (1 - a)),
    Math.round(layer[1] * a + backdrop[1] * (1 - a)),
    Math.round(layer[2] * a + backdrop[2] * (1 - a)),
  ];
}

/** Composite a stack of translucent layers, bottom-most backdrop first. */
export function compositeStack(backdrop: Rgb, ...layers: Rgba[]): Rgb {
  return layers.reduce<Rgb>((acc, layer) => compositeOver(layer, acc), backdrop);
}

/** WCAG relative luminance. */
export function relativeLuminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two opaque colours (1..21). */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Contrast of translucent text-coloured foreground over a composited surface.
 * Text tokens in this codebase are opaque, but muted/decorative usages apply an
 * opacity, so the helper accepts an alpha.
 */
export function contrastOnSurface(fg: Rgba, surface: Rgb): number {
  return contrastRatio(compositeOver(fg, surface), surface);
}

/**
 * Colour-vision-deficiency simulation (Brettel/Viénot-style linear approximation
 * in sRGB). Good enough to answer "do these two UI colours still read as
 * different?", which is all AC-6 of US-143 asks for.
 */
export type ColorVision = 'deuteranopia' | 'protanopia' | 'tritanopia';

const CVD_MATRICES: Record<ColorVision, readonly number[]> = {
  // rows: R', G', B'
  protanopia: [0.567, 0.433, 0.0, 0.558, 0.442, 0.0, 0.0, 0.242, 0.758],
  deuteranopia: [0.625, 0.375, 0.0, 0.7, 0.3, 0.0, 0.0, 0.3, 0.7],
  tritanopia: [0.95, 0.05, 0.0, 0.0, 0.433, 0.567, 0.0, 0.475, 0.525],
};

export function simulateColorVision(rgb: Rgb, type: ColorVision): Rgb {
  const m = CVD_MATRICES[type];
  const [r, g, b] = rgb;
  return [
    Math.round(clamp255(m[0] * r + m[1] * g + m[2] * b)),
    Math.round(clamp255(m[3] * r + m[4] * g + m[5] * b)),
    Math.round(clamp255(m[6] * r + m[7] * g + m[8] * b)),
  ];
}

/**
 * Perceptual distance in CIE76 ΔE*ab. Two UI colours are generally treated as
 * "distinguishable at a glance" from ΔE ≈ 10 upward.
 */
export function deltaE76(a: Rgb, b: Rgb): number {
  const [l1, a1, b1] = rgbToLab(a);
  const [l2, a2, b2] = rgbToLab(b);
  return Math.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
}

function rgbToLab(rgb: Rgb): [number, number, number] {
  const linear = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  // sRGB D65 -> XYZ
  const x = (linear[0] * 0.4124 + linear[1] * 0.3576 + linear[2] * 0.1805) / 0.95047;
  const y = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  const z = (linear[0] * 0.0193 + linear[1] * 0.1192 + linear[2] * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** Format a colour for assertion messages. */
export function formatRgb(rgb: Rgb): string {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}
