import { describe, it, expect, vi, beforeEach } from 'vitest';

const createSignedUrl = vi.fn();
const getPublicUrl = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: (bucket: string) => ({
        createSignedUrl: (path: string, ttl: number) => createSignedUrl(bucket, path, ttl),
        getPublicUrl: (path: string) => getPublicUrl(bucket, path),
      }),
    },
  },
}));

import {
  DEFAULT_SIGNED_URL_TTL_SECONDS,
  isAbsoluteUrl,
  isPublicAssetBucket,
  parseStorageUrl,
  resolveStorageUrl,
  resolveStorageUrls,
} from '@/lib/storage/signedUrl';

const HOST = 'https://ilhzuvemiuyfuxfegtlv.supabase.co';

beforeEach(() => {
  createSignedUrl.mockReset();
  getPublicUrl.mockReset();
  createSignedUrl.mockImplementation((bucket: string, path: string) => ({
    data: { signedUrl: `${HOST}/storage/v1/object/sign/${bucket}/${path}?token=abc` },
    error: null,
  }));
  getPublicUrl.mockImplementation((bucket: string, path: string) => ({
    data: { publicUrl: `${HOST}/storage/v1/object/public/${bucket}/${path}` },
  }));
});

describe('parseStorageUrl', () => {
  it('recovers bucket and path from a public URL', () => {
    expect(parseStorageUrl(`${HOST}/storage/v1/object/public/project-documents/inspections/42/photo.jpg`))
      .toEqual({ bucket: 'project-documents', path: 'inspections/42/photo.jpg' });
  });

  it('recovers bucket and path from a signed URL, dropping the token', () => {
    expect(parseStorageUrl(`${HOST}/storage/v1/object/sign/documents/a/b.pdf?token=xyz`))
      .toEqual({ bucket: 'documents', path: 'a/b.pdf' });
  });

  it('decodes percent-encoded paths', () => {
    expect(parseStorageUrl(`${HOST}/storage/v1/object/public/project-files/chat/my%20file.png`))
      .toEqual({ bucket: 'project-files', path: 'chat/my file.png' });
  });

  it('returns null for things that are not storage URLs', () => {
    expect(parseStorageUrl('data:image/png;base64,AAA')).toBeNull();
    expect(parseStorageUrl('https://example.com/photo.jpg')).toBeNull();
    expect(parseStorageUrl('')).toBeNull();
  });
});

describe('isAbsoluteUrl', () => {
  it.each(['https://x/y', 'http://x/y', 'data:image/png;base64,AA', 'blob:https://x/1'])(
    'treats %s as absolute', (v) => expect(isAbsoluteUrl(v)).toBe(true),
  );

  it.each(['inspections/42/a.jpg', 'chat-attachments/1/x.png'])(
    'treats %s as a storage path', (v) => expect(isAbsoluteUrl(v)).toBe(false),
  );
});

describe('resolveStorageUrl', () => {
  it('signs a path in a private bucket', async () => {
    const url = await resolveStorageUrl('project-documents', 'inspections/42/photo.jpg');
    expect(createSignedUrl).toHaveBeenCalledWith(
      'project-documents', 'inspections/42/photo.jpg', DEFAULT_SIGNED_URL_TTL_SECONDS,
    );
    expect(url).toContain('/object/sign/project-documents/');
    expect(getPublicUrl).not.toHaveBeenCalled();
  });

  it('honours a custom expiry', async () => {
    await resolveStorageUrl('documents', 'a/b.pdf', { expiresIn: 90 });
    expect(createSignedUrl).toHaveBeenCalledWith('documents', 'a/b.pdf', 90);
  });

  it('keeps public URLs for deliberately public asset buckets', async () => {
    const url = await resolveStorageUrl('site-assets', 'logo.png');
    expect(getPublicUrl).toHaveBeenCalledWith('site-assets', 'logo.png');
    expect(createSignedUrl).not.toHaveBeenCalled();
    expect(url).toContain('/object/public/site-assets/');
  });

  // The dual-read behaviour the staged rollout depends on: rows written before
  // this change, and shipped iOS builds, hold full public URLs.
  it('signs a legacy stored public URL instead of handing it back', async () => {
    const legacy = `${HOST}/storage/v1/object/public/project-documents/inspections/42/photo.jpg`;
    const url = await resolveStorageUrl('project-documents', legacy);
    expect(createSignedUrl).toHaveBeenCalledWith(
      'project-documents', 'inspections/42/photo.jpg', DEFAULT_SIGNED_URL_TTL_SECONDS,
    );
    expect(url).toContain('/object/sign/');
    expect(url).not.toBe(legacy);
  });

  it('trusts the bucket in a legacy URL over the caller argument', async () => {
    const legacy = `${HOST}/storage/v1/object/public/project-communications/a/b.png`;
    await resolveStorageUrl('project-documents', legacy);
    expect(createSignedUrl).toHaveBeenCalledWith('project-communications', 'a/b.png', DEFAULT_SIGNED_URL_TTL_SECONDS);
  });

  it('passes through a data: fallback unchanged', async () => {
    const data = 'data:image/png;base64,AAAA';
    expect(await resolveStorageUrl('project-documents', data)).toBe(data);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it('passes through an unrelated external URL unchanged', async () => {
    const ext = 'https://images.unsplash.com/photo-1.jpg';
    expect(await resolveStorageUrl('project-documents', ext)).toBe(ext);
  });

  it('returns null rather than a broken link when signing fails', async () => {
    createSignedUrl.mockReturnValue({ data: null, error: { message: 'Object not found' } });
    expect(await resolveStorageUrl('documents', 'missing.pdf')).toBeNull();
  });

  it('returns null for an empty reference', async () => {
    expect(await resolveStorageUrl('documents', '')).toBeNull();
  });
});

describe('resolveStorageUrls', () => {
  it('preserves order and isolates failures', async () => {
    createSignedUrl.mockImplementation((bucket: string, path: string) =>
      path === 'bad.pdf'
        ? { data: null, error: { message: 'gone' } }
        : { data: { signedUrl: `${HOST}/storage/v1/object/sign/${bucket}/${path}?token=t` }, error: null },
    );

    const out = await resolveStorageUrls([
      { bucket: 'documents', stored: 'a.pdf' },
      { bucket: 'documents', stored: 'bad.pdf' },
      { bucket: 'documents', stored: 'c.pdf' },
    ]);

    expect(out).toHaveLength(3);
    expect(out[0]).toContain('a.pdf');
    expect(out[1]).toBeNull();
    expect(out[2]).toContain('c.pdf');
  });
});

describe('bucket classification', () => {
  it('treats only marketing asset buckets as public', () => {
    expect(isPublicAssetBucket('site-assets')).toBe(true);
    expect(isPublicAssetBucket('blog-images')).toBe(true);
    for (const b of ['project-documents', 'company-documents', 'project-communications',
                     'project-files', 'documents', 'chat-files', 'receipts', 'expense-receipts']) {
      expect(isPublicAssetBucket(b), `${b} must not be public`).toBe(false);
    }
  });
});
