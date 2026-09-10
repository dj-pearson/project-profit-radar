import { describe, it, expect } from 'vitest';
import { absoluteUrl, SITE_URL } from '../canonical';

describe('absoluteUrl', () => {
  it('absolutizes the root-relative form 31 pages pass', () => {
    expect(absoluteUrl('/pricing', '/pricing')).toBe(`${SITE_URL}/pricing`);
    expect(absoluteUrl('/resources/quickbooks-integration-guide', '/x')).toBe(
      `${SITE_URL}/resources/quickbooks-integration-guide`
    );
  });

  it('leaves the absolute form 20 pages pass alone', () => {
    expect(absoluteUrl(`${SITE_URL}/commercial-contractors`, '/x')).toBe(
      `${SITE_URL}/commercial-contractors`
    );
  });

  it('falls back to the route pathname when a page passes nothing', () => {
    expect(absoluteUrl(undefined, '/faq')).toBe(`${SITE_URL}/faq`);
    expect(absoluteUrl('', '/faq')).toBe(`${SITE_URL}/faq`);
    expect(absoluteUrl(null, '/faq')).toBe(`${SITE_URL}/faq`);
  });

  it('writes the homepage the way the sitemap writes it', () => {
    // generate-sitemap.js emits <loc>https://brikly.net/</loc>; Index.tsx passes
    // the slashless form. A canonical that disagrees with the sitemap is two URLs.
    expect(absoluteUrl(SITE_URL, '/')).toBe(`${SITE_URL}/`);
    expect(absoluteUrl('/', '/')).toBe(`${SITE_URL}/`);
    expect(absoluteUrl(undefined, '/')).toBe(`${SITE_URL}/`);
  });

  it('strips a trailing slash everywhere else, matching the sitemap', () => {
    expect(absoluteUrl('/features/', '/x')).toBe(`${SITE_URL}/features`);
    expect(absoluteUrl(`${SITE_URL}/features/`, '/x')).toBe(`${SITE_URL}/features`);
  });

  it('drops query and hash so a campaign link cannot split the page signals', () => {
    expect(absoluteUrl('/pricing?utm_source=linkedin', '/x')).toBe(`${SITE_URL}/pricing`);
    expect(absoluteUrl('/pricing#plans', '/x')).toBe(`${SITE_URL}/pricing`);
  });

  it('handles a bare slug without a leading slash', () => {
    expect(absoluteUrl('pricing', '/x')).toBe(`${SITE_URL}/pricing`);
  });
});
