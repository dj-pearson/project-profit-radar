import { supabase } from '@/integrations/supabase/client';

/**
 * Resolving storage URLs.
 *
 * Background
 * ----------
 * Three buckets holding customer content were created with `public = true`
 * (project-documents and company-documents in migration 20250703014008,
 * project-communications in 20250706130335). Supabase does not apply
 * storage.objects RLS to reads through the /storage/v1/object/public/ path, so
 * the policies written beneath those INSERT statements never restricted reads
 * at all. Callers made it worse by persisting the permanent, unauthenticated
 * `publicUrl` into the database - chat_messages.metadata.attachments[].url,
 * inspection photo entries, expense receipts - so those links outlive any
 * later permission change.
 *
 * This module is the single decision point for how a stored object becomes a
 * URL: deliberately-public marketing assets keep public URLs, everything else
 * gets a short-lived signed URL.
 *
 * Migration shape (US-289)
 * ------------------------
 * Rows written before this existed hold full public URLs rather than storage
 * paths, and shipped iOS builds still hold such URLs too. `resolveStorageUrl`
 * therefore accepts either form: given a legacy URL it recovers the bucket and
 * path and signs those instead. That is the dual-read step in the CLAUDE.md
 * deprecation flow, and it is what lets the bucket `public` flag be flipped
 * later without breaking existing data.
 */

/** Buckets that are deliberately world-readable. Keep in sync with supabase/functions/_shared/storage-buckets.ts. */
export const PUBLIC_ASSET_BUCKETS = new Set(['site-assets', 'blog-images']);

/** Default signed-URL lifetime. Long enough to load a page, short enough to be useless if leaked. */
export const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60;

export interface StorageRef {
  bucket: string;
  path: string;
}

/**
 * Recover {bucket, path} from a Supabase storage URL, public or signed.
 *
 * Returns null for anything that is not a storage URL, including the data:
 * URLs that some upload paths fall back to.
 */
export function parseStorageUrl(value: string): StorageRef | null {
  if (!value || typeof value !== 'string') return null;
  if (!value.includes('/storage/v1/object/')) return null;

  // .../storage/v1/object/public/<bucket>/<path>
  // .../storage/v1/object/sign/<bucket>/<path>?token=...
  // .../storage/v1/object/<bucket>/<path>
  const match = value.match(/\/storage\/v1\/object\/(?:public\/|sign\/|authenticated\/)?([^/?#]+)\/([^?#]+)/);
  if (!match) return null;

  const [, bucket, encodedPath] = match;
  let path: string;
  try {
    path = decodeURIComponent(encodedPath);
  } catch {
    path = encodedPath;
  }
  if (!bucket || !path) return null;
  return { bucket, path };
}

/** True when the value already looks like a full URL rather than a storage path. */
export function isAbsoluteUrl(value: string): boolean {
  return /^(https?:|data:|blob:)/i.test(value);
}

export function isPublicAssetBucket(bucket: string): boolean {
  return PUBLIC_ASSET_BUCKETS.has(bucket);
}

/**
 * Turn a stored reference into a URL the browser can load.
 *
 * `stored` may be a storage path (what writers should persist from now on) or
 * a legacy absolute URL (what older rows and older app builds hold). Anything
 * that is not a Supabase storage URL - a data: fallback, an external link - is
 * passed through unchanged.
 *
 * Returns null when a signed URL could not be produced, so callers render a
 * placeholder rather than a broken image.
 */
export async function resolveStorageUrl(
  bucket: string,
  stored: string,
  options: { expiresIn?: number } = {},
): Promise<string | null> {
  if (!stored) return null;

  let targetBucket = bucket;
  let path = stored;

  if (isAbsoluteUrl(stored)) {
    const parsed = parseStorageUrl(stored);
    // Not ours (data:, blob:, an external CDN) - hand it back untouched.
    if (!parsed) return stored;
    targetBucket = parsed.bucket;
    path = parsed.path;
  }

  if (isPublicAssetBucket(targetBucket)) {
    return supabase.storage.from(targetBucket).getPublicUrl(path).data.publicUrl;
  }

  const { data, error } = await supabase.storage
    .from(targetBucket)
    .createSignedUrl(path, options.expiresIn ?? DEFAULT_SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/**
 * Resolve many references at once, preserving order.
 *
 * Failures come back as null rather than rejecting the whole batch, so one
 * missing object does not blank an entire gallery.
 */
export async function resolveStorageUrls(
  refs: { bucket: string; stored: string }[],
  options: { expiresIn?: number } = {},
): Promise<(string | null)[]> {
  return Promise.all(refs.map((r) => resolveStorageUrl(r.bucket, r.stored, options)));
}

/**
 * Resolve a stored reference and open it in a new tab.
 *
 * Download buttons cannot use the stored value directly any more: a path is not
 * a URL, and a signed URL has to be minted at click time. Returns false when the
 * object could not be resolved so the caller can surface an error.
 */
export async function openStorageObject(
  bucket: string,
  stored: string | null | undefined,
  options: { expiresIn?: number } = {},
): Promise<boolean> {
  if (!stored) return false;
  const url = await resolveStorageUrl(bucket, stored, options);
  if (!url) return false;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
