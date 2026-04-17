/**
 * Client-side image compression utility.
 *
 * Field users on cellular shouldn't upload 5 MB iPhone photos when a 400 KB
 * JPEG looks identical on any screen they'll ever render it on. We draw the
 * source into an off-screen canvas capped at `maxDimension` on the long edge
 * and re-encode at the configured quality.
 *
 * Pass-through cases (returns the original File untouched):
 *   - SVG and GIF — vector / animated, canvas re-encode would destroy them
 *   - Already-small files (below `minSizeToCompress`)
 *   - Non-image types (defensive — callers should have validated, but we also check)
 *   - Environments without an HTMLCanvasElement (SSR / tests without happy-dom canvas)
 */

export interface CompressImageOptions {
  /** Longest edge of the output image in CSS pixels. Default 1920. */
  maxDimension?: number;
  /** JPEG/WebP quality from 0..1. Default 0.8. */
  quality?: number;
  /** Output MIME type. Default 'image/jpeg' — broadest Supabase Storage + iOS Safari support. */
  mimeType?: 'image/jpeg' | 'image/webp';
  /** Skip compression when file size is below this many bytes. Default 200 KB. */
  minSizeToCompress?: number;
}

const DEFAULTS: Required<CompressImageOptions> = {
  maxDimension: 1920,
  quality: 0.8,
  mimeType: 'image/jpeg',
  minSizeToCompress: 200 * 1024,
};

const PASSTHROUGH_MIME = new Set<string>([
  'image/svg+xml',
  'image/gif',
]);

/**
 * Compress an image File. Returns either a new compressed File or the original
 * File if compression is skipped / fails (we never block the upload path on
 * compression errors).
 */
export async function compressImage(
  file: File,
  options: CompressImageOptions = {}
): Promise<File> {
  const opts = { ...DEFAULTS, ...options };

  if (!file.type.startsWith('image/')) return file;
  if (PASSTHROUGH_MIME.has(file.type)) return file;
  if (file.size <= opts.minSizeToCompress) return file;
  if (typeof document === 'undefined') return file;

  try {
    // Race the decode against a 5 s timeout — a corrupt image that the
    // browser can't decode should never block the upload pipeline.
    const bitmap = await Promise.race([
      loadBitmap(file),
      new Promise<AnyBitmap>((_, reject) =>
        setTimeout(() => reject(new Error('image decode timeout')), 5000)
      ),
    ]);
    const { width, height } = scaleToFit(bitmap.width, bitmap.height, opts.maxDimension);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, width, height);
    closeBitmap(bitmap);

    const blob = await canvasToBlob(canvas, opts.mimeType, opts.quality);
    if (!blob) return file;

    // If the re-encoded blob ended up larger (tiny image, already-compressed
    // JPEG, etc.) keep the original.
    if (blob.size >= file.size) return file;

    const outName = replaceExtension(file.name, opts.mimeType === 'image/webp' ? 'webp' : 'jpg');
    return new File([blob], outName, {
      type: opts.mimeType,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

type AnyBitmap = ImageBitmap | HTMLImageElement;

async function loadBitmap(file: File): Promise<AnyBitmap> {
  if (typeof createImageBitmap === 'function') {
    return await createImageBitmap(file);
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

function closeBitmap(bitmap: AnyBitmap) {
  if ('close' in bitmap && typeof bitmap.close === 'function') {
    bitmap.close();
  }
}

function scaleToFit(srcW: number, srcH: number, maxDim: number) {
  const longest = Math.max(srcW, srcH);
  if (longest <= maxDim) return { width: srcW, height: srcH };
  const ratio = maxDim / longest;
  return {
    width: Math.round(srcW * ratio),
    height: Math.round(srcH * ratio),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

function replaceExtension(name: string, newExt: string): string {
  const dot = name.lastIndexOf('.');
  const base = dot === -1 ? name : name.slice(0, dot);
  return `${base}.${newExt}`;
}
