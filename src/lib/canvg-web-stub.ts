/**
 * canvg is not bundled, deliberately.
 *
 * jsPDF reaches for it in exactly one place - `doc.addSvgAsImage()`, which is
 * a dynamic `import("canvg")` - and nothing in Brikly calls that. Rollup still
 * resolved the dynamic import and emitted canvg's lib/index.es.js as a 50.3 KB
 * gzipped chunk, with core-js inlined into it, for a code path that never runs.
 * That is more than the amount by which the bundle budget was over.
 *
 * jsPDF already handles this import failing: it wraps the call in
 * `.then(..., () => Promise.reject(new Error("Could not load canvg.")))`, so a
 * throwing stub surfaces as a clear runtime error rather than a broken PDF.
 *
 * If SVG-to-PDF is ever needed, drop the `canvg` alias from vite.config.ts and
 * this file with it.
 */
const unavailable = (): never => {
  throw new Error(
    'canvg is aliased out of the web bundle (see src/lib/canvg-web-stub.ts). ' +
      'jsPDF.addSvgAsImage() is its only caller. Remove the alias in vite.config.ts to use it.',
  );
};

export class Canvg {
  static from = unavailable;
  static fromString = unavailable;
}

export const presets = {};

export default Canvg;
