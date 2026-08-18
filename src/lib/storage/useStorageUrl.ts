import { useEffect, useState } from 'react';
import { resolveStorageUrl } from '@/lib/storage/signedUrl';

/**
 * Resolve a stored storage reference to a loadable URL.
 *
 * Signed URLs expire, so they cannot be baked into a row and reused - they have
 * to be minted at display time. This hook does that, and handles the two
 * representations that coexist during the US-289 rollout: a storage path (what
 * writers persist now) and a legacy absolute public URL (what older rows hold).
 *
 * Returns null while resolving and when resolution fails, so callers can render
 * a placeholder rather than a broken image.
 */
export function useStorageUrl(
  bucket: string,
  stored: string | null | undefined,
  options: { expiresIn?: number } = {},
): { url: string | null; loading: boolean } {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(stored));
  const expiresIn = options.expiresIn;

  useEffect(() => {
    let cancelled = false;

    if (!stored) {
      setUrl(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    resolveStorageUrl(bucket, stored, expiresIn ? { expiresIn } : {})
      .then((resolved) => {
        if (!cancelled) {
          setUrl(resolved);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUrl(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [bucket, stored, expiresIn]);

  return { url, loading };
}
