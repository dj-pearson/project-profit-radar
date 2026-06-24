/**
 * SRI (Subresource Integrity) Hash Generator
 *
 * US-009: Generate SHA-384 integrity hashes for external resources.
 *
 * Usage:
 *   node scripts/generate-sri-hashes.js <url>
 *   node scripts/generate-sri-hashes.js https://www.googletagmanager.com/gtag/js?id=G-LNDT7H4SJR
 *
 * Output:
 *   sha384-<base64hash>
 *
 * Note: External scripts served by CDNs like Google Tag Manager change their
 * content frequently, making static SRI hashes impractical for those resources.
 * This tool is still useful for pinned-version libraries (e.g., from cdn.jsdelivr.net).
 */

import { createHash } from 'node:crypto';

/**
 * Fetches a URL and returns its text content.
 * @param {string} url - The URL to fetch
 * @returns {Promise<string>} The response body as text
 */
async function fetchResource(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Brikly-SRI-Generator/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

/**
 * Generates a SHA-384 SRI hash for the given content.
 * @param {string} content - The resource content to hash
 * @returns {string} The SRI hash in "sha384-<base64>" format
 */
function generateSriHash(content) {
  const hash = createHash('sha384').update(content, 'utf-8').digest('base64');
  return `sha384-${hash}`;
}

/**
 * Fetches a URL and returns its SRI hash.
 * @param {string} url - The URL of the external resource
 * @returns {Promise<{url: string, hash: string, size: number}>}
 */
async function generateSriHashForUrl(url) {
  const content = await fetchResource(url);
  const hash = generateSriHash(content);
  return {
    url,
    hash,
    size: Buffer.byteLength(content, 'utf-8'),
  };
}

/**
 * Known external resource URLs used by Brikly.
 * These are documented here even if SRI is not practical for all of them.
 */
const KNOWN_EXTERNAL_RESOURCES = [
  {
    url: 'https://www.googletagmanager.com/gtag/js?id=G-LNDT7H4SJR',
    note: 'Google Tag Manager - content changes frequently, SRI not practical for production use',
    loadedVia: 'Dynamic script injection in index.html (requestIdleCallback/setTimeout)',
  },
];

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // No URL provided - show known resources and generate hashes for them
    console.log('Brikly SRI Hash Generator');
    console.log('============================\n');
    console.log('Usage: node scripts/generate-sri-hashes.js <url>\n');
    console.log('Known external resources:\n');

    for (const resource of KNOWN_EXTERNAL_RESOURCES) {
      console.log(`  URL:        ${resource.url}`);
      console.log(`  Loaded via: ${resource.loadedVia}`);
      console.log(`  Note:       ${resource.note}`);

      try {
        const result = await generateSriHashForUrl(resource.url);
        console.log(`  Hash:       ${result.hash}`);
        console.log(`  Size:       ${result.size} bytes`);
      } catch (err) {
        console.log(`  Hash:       (failed to fetch: ${err.message})`);
      }
      console.log('');
    }

    console.log(
      'NOTE: index.html currently has NO static <script src="..."> or <link href="..."> tags\n' +
        'loading external resources. Google Tag Manager is loaded dynamically via JavaScript.\n' +
        'SRI hashes are most useful for statically-referenced, version-pinned resources.\n' +
        'The sriVerification.ts utilities are available for any future external dependencies.'
    );
    return;
  }

  // Generate hash for a specific URL
  const url = args[0];

  try {
    new URL(url);
  } catch {
    console.error(`Error: "${url}" is not a valid URL.`);
    process.exit(1);
  }

  try {
    const result = await generateSriHashForUrl(url);
    console.log(result.hash);

    // If --verbose flag is provided, show extra info
    if (args.includes('--verbose')) {
      console.log(`\nURL:  ${result.url}`);
      console.log(`Size: ${result.size} bytes`);
      console.log(`\nHTML usage:`);
      console.log(`  <script src="${result.url}" integrity="${result.hash}" crossorigin="anonymous"></script>`);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
