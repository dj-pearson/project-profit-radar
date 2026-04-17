import { describe, it, expect } from 'vitest';
import { compressImage } from '../image-compression';

const makeFile = (size: number, type: string, name = 'photo'): File => {
  // Fill with zeroes — content doesn't matter for pass-through paths
  // (happy-dom's canvas doesn't implement image decode, so the compress
  // path falls through to the try/catch and returns the original file;
  // we test that behavior here rather than real compression).
  const bytes = new Uint8Array(size);
  return new File([bytes], `${name}.${extensionFor(type)}`, { type });
};

const extensionFor = (type: string) => {
  switch (type) {
    case 'image/svg+xml':
      return 'svg';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    default:
      return 'bin';
  }
};

describe('compressImage', () => {
  it('returns the original file untouched for SVG', async () => {
    const file = makeFile(2 * 1024 * 1024, 'image/svg+xml');
    const result = await compressImage(file);
    expect(result).toBe(file);
  });

  it('returns the original file untouched for GIF', async () => {
    const file = makeFile(2 * 1024 * 1024, 'image/gif');
    const result = await compressImage(file);
    expect(result).toBe(file);
  });

  it('returns the original file when under the size threshold', async () => {
    // 100 KB — well under the 200 KB default
    const file = makeFile(100 * 1024, 'image/jpeg');
    const result = await compressImage(file);
    expect(result).toBe(file);
  });

  it('returns the original file when passed a non-image type', async () => {
    const file = new File(['x'], 'notes.txt', { type: 'text/plain' });
    const result = await compressImage(file);
    expect(result).toBe(file);
  });

  it('respects a custom minSizeToCompress threshold', async () => {
    const file = makeFile(50 * 1024, 'image/jpeg');
    // Raise threshold above the file size → should pass through
    const result = await compressImage(file, { minSizeToCompress: 100 * 1024 });
    expect(result).toBe(file);
  });

  it('falls back to the original file when decode times out on corrupt data', async () => {
    // 500 KB of zeroes isn't a valid JPEG. The decode race should reject
    // (either immediately via the decoder or via the 5 s timeout) and the
    // function must return the original File rather than throwing. We give
    // the test plenty of headroom beyond the 5 s internal timeout.
    const file = makeFile(500 * 1024, 'image/jpeg');
    const result = await compressImage(file);
    expect(result).toBeInstanceOf(File);
  }, 10000);
});
