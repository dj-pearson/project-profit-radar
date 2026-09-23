/**
 * Escape a value for interpolation into HTML text or a quoted attribute.
 *
 * Pure (no Deno globals, no remote imports) so vitest can import it directly.
 * invite-email.ts re-exports it for the callers that already import it there.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
