/**
 * Subresource Integrity (SRI) Verification Utilities
 *
 * US-009: Provides functions to verify SRI hashes and load external scripts
 * with integrity attributes to prevent supply-chain attacks.
 *
 * Uses the Web Crypto API (crypto.subtle) for browser-native hashing.
 *
 * Current state (as of 2026-03):
 *   index.html has NO static external <script src> or <link href> tags.
 *   Google Tag Manager is loaded dynamically via inline JavaScript.
 *   These utilities are available for any future external dependencies.
 */

/** Supported SRI hash algorithms. */
type SriAlgorithm = 'sha256' | 'sha384' | 'sha512';

/** Maps SRI algorithm names to Web Crypto algorithm identifiers. */
const ALGORITHM_MAP: Record<SriAlgorithm, string> = {
  sha256: 'SHA-256',
  sha384: 'SHA-384',
  sha512: 'SHA-512',
};

/**
 * Converts an ArrayBuffer to a base64 string.
 */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Parses an SRI hash string into its algorithm and digest components.
 *
 * @param sriHash - e.g. "sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
 * @returns The algorithm and base64 digest, or null if the format is invalid.
 */
function parseSriHash(sriHash: string): { algorithm: SriAlgorithm; digest: string } | null {
  const match = sriHash.match(/^(sha256|sha384|sha512)-(.+)$/);
  if (!match) return null;
  return {
    algorithm: match[1] as SriAlgorithm,
    digest: match[2],
  };
}

/**
 * Computes an SRI hash for the given content string.
 *
 * @param content  - The text content to hash.
 * @param algorithm - The hash algorithm (default: 'sha384').
 * @returns The SRI hash in "algorithm-base64digest" format.
 *
 * @example
 * ```ts
 * const hash = await computeSriHash('logger.debug("hello");');
 * // "sha384-..."
 * ```
 */
export async function computeSriHash(
  content: string,
  algorithm: SriAlgorithm = 'sha384',
): Promise<string> {
  const cryptoAlgorithm = ALGORITHM_MAP[algorithm];
  if (!cryptoAlgorithm) {
    throw new Error(`Unsupported SRI algorithm: ${algorithm}`);
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest(cryptoAlgorithm, data);
  const base64 = bufferToBase64(hashBuffer);

  return `${algorithm}-${base64}`;
}

/**
 * Verifies that the given content matches the expected SRI hash.
 *
 * @param content       - The text content to verify.
 * @param expectedHash  - The expected SRI hash (e.g. "sha384-abc123...").
 * @returns `true` if the content matches the hash, `false` otherwise.
 *
 * @example
 * ```ts
 * const script = await fetch('https://cdn.example.com/lib.js').then(r => r.text());
 * const isValid = await verifySriHash(script, 'sha384-abc123...');
 * if (!isValid) {
 *   throw new Error('Script integrity check failed!');
 * }
 * ```
 */
export async function verifySriHash(
  content: string,
  expectedHash: string,
): Promise<boolean> {
  const parsed = parseSriHash(expectedHash);
  if (!parsed) {
    console.error(`[SRI] Invalid hash format: "${expectedHash}". Expected "sha(256|384|512)-<base64>".`);
    return false;
  }

  const computedHash = await computeSriHash(content, parsed.algorithm);
  return computedHash === expectedHash;
}

/**
 * Options for loading an external script with SRI.
 */
export interface LoadScriptWithSriOptions {
  /** Whether the script should load asynchronously. Default: true. */
  async?: boolean;
  /** Whether the script should be deferred. Default: false. */
  defer?: boolean;
  /** Where to append the script element. Default: document.head. */
  parent?: HTMLElement;
  /** Optional id attribute for the script element. */
  id?: string;
  /** Optional callback invoked on successful load. */
  onLoad?: () => void;
  /** Optional callback invoked on load error. */
  onError?: (error: Event) => void;
}

/**
 * Creates and appends a `<script>` element with `integrity` and
 * `crossorigin="anonymous"` attributes for Subresource Integrity protection.
 *
 * @param src        - The URL of the external script.
 * @param integrity  - The SRI hash (e.g. "sha384-...").
 * @param options    - Optional configuration.
 * @returns A promise that resolves when the script loads, or rejects on error.
 *
 * @example
 * ```ts
 * await loadScriptWithSri(
 *   'https://cdn.jsdelivr.net/npm/some-lib@1.0.0/dist/lib.min.js',
 *   'sha384-abc123...',
 *   { async: true }
 * );
 * ```
 */
export function loadScriptWithSri(
  src: string,
  integrity: string,
  options: LoadScriptWithSriOptions = {},
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // Validate the integrity hash format before creating the element
    const parsed = parseSriHash(integrity);
    if (!parsed) {
      const error = new Error(
        `[SRI] Invalid integrity hash format: "${integrity}". Expected "sha(256|384|512)-<base64>".`,
      );
      reject(error);
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.integrity = integrity;
    script.crossOrigin = 'anonymous';

    if (options.async !== false) {
      script.async = true;
    }
    if (options.defer) {
      script.defer = true;
    }
    if (options.id) {
      script.id = options.id;
    }

    script.addEventListener('load', () => {
      options.onLoad?.();
      resolve();
    });

    script.addEventListener('error', (event) => {
      const error = new Error(
        `[SRI] Failed to load script: ${src}. This may indicate a tampered resource or a hash mismatch.`,
      );
      console.error(error.message);
      options.onError?.(event);
      reject(error);
    });

    const parent = options.parent ?? document.head;
    parent.appendChild(script);
  });
}

/**
 * Creates and appends a `<link rel="stylesheet">` element with `integrity`
 * and `crossorigin="anonymous"` attributes for SRI protection.
 *
 * @param href       - The URL of the external stylesheet.
 * @param integrity  - The SRI hash (e.g. "sha384-...").
 * @returns A promise that resolves when the stylesheet loads, or rejects on error.
 *
 * @example
 * ```ts
 * await loadStylesheetWithSri(
 *   'https://cdn.jsdelivr.net/npm/some-lib@1.0.0/dist/style.min.css',
 *   'sha384-xyz789...',
 * );
 * ```
 */
export function loadStylesheetWithSri(
  href: string,
  integrity: string,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const parsed = parseSriHash(integrity);
    if (!parsed) {
      const error = new Error(
        `[SRI] Invalid integrity hash format: "${integrity}". Expected "sha(256|384|512)-<base64>".`,
      );
      reject(error);
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.integrity = integrity;
    link.crossOrigin = 'anonymous';

    link.addEventListener('load', () => resolve());
    link.addEventListener('error', (event) => {
      const error = new Error(
        `[SRI] Failed to load stylesheet: ${href}. This may indicate a tampered resource or a hash mismatch.`,
      );
      console.error(error.message);
      reject(error);
    });

    document.head.appendChild(link);
  });
}
