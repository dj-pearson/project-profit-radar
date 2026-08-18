import React from 'react';
import { useStorageUrl } from '@/lib/storage/useStorageUrl';

interface StorageImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** Bucket to resolve against when `stored` is a path rather than a legacy URL. */
  bucket: string;
  /** Storage path, or a legacy absolute URL from a row written before US-289. */
  stored: string | null | undefined;
  /** Rendered while the signed URL is being minted or when it cannot be. */
  fallback?: React.ReactNode;
}

/**
 * An <img> whose source is a private storage object.
 *
 * Signed URLs are minted per render rather than stored, so this cannot be
 * replaced by putting a URL in the database - that is the practice US-289
 * exists to undo.
 */
export const StorageImage: React.FC<StorageImageProps> = ({
  bucket,
  stored,
  fallback = null,
  alt = '',
  ...imgProps
}) => {
  const { url, loading } = useStorageUrl(bucket, stored);

  if (loading || !url) return <>{fallback}</>;
  return <img src={url} alt={alt} {...imgProps} />;
};
