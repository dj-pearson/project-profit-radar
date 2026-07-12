/**
 * Serialize a value for embedding inside a <script type="application/ld+json">
 * tag via dangerouslySetInnerHTML.
 *
 * SECURITY (US-245): JSON.stringify does NOT escape `<`, so a DB-sourced value
 * containing `</script>` (e.g. a pSEO field, FAQ answer, or testimonial) would
 * break out of the script element and inject arbitrary markup — a stored XSS
 * vector. This escapes the tag/script-terminating characters plus the JS
 * line/paragraph separators (U+2028/U+2029). Each replacement is a valid JSON
 * \uXXXX escape, so the parsed JSON-LD is unchanged.
 */
export function jsonLdSafe(data: unknown): string {
  return JSON.stringify(data ?? {}).replace(
    /[<>&\u2028\u2029]/g,
    (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"),
  );
}
