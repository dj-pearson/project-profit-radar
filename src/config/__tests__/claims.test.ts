import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  CLAIMS,
  renderableTestimonials,
  renderableClientReferences,
  renderableCaseStudies,
} from '@/config/claims';

/**
 * Guards for the marketing-claims registry.
 *
 * These exist because fabricated endorsements were shipped to production once
 * already: six invented customers on the homepage, three more in the trial
 * email sequence, an invented "ABC Construction" case study, and a JSON-LD
 * aggregateRating of 4.8-4.9 from 247-500 reviews that never existed. The
 * first cleanup pass fixed SocialProof.tsx and missed everything else, so the
 * point of these tests is to make the next regression fail in CI rather than
 * in front of the FTC.
 */
describe('claims registry', () => {
  it('never renders an endorsement without a filed permission source', () => {
    for (const t of CLAIMS.testimonials.value) {
      expect(t.permissionSource, `testimonial by ${t.author}`).toBeTruthy();
    }
    for (const c of CLAIMS.clientReferences.value) {
      expect(c.permissionSource, `client reference ${c.name}`).toBeTruthy();
    }
    for (const c of CLAIMS.caseStudies.value) {
      expect(c.permissionSource, `case study ${c.company}`).toBeTruthy();
    }
  });

  it('returns nothing renderable while the claims are unverified', () => {
    if (!CLAIMS.testimonials.verified) expect(renderableTestimonials()).toHaveLength(0);
    if (!CLAIMS.clientReferences.verified) expect(renderableClientReferences()).toHaveLength(0);
    if (!CLAIMS.caseStudies.verified) expect(renderableCaseStudies()).toHaveLength(0);
  });

  it('keeps a substantiation source on every unverified claim', () => {
    for (const [name, claim] of Object.entries(CLAIMS)) {
      if (!claim.verified) {
        expect(claim.source, `${name} needs a source explaining what would substantiate it`).toBeTruthy();
      }
    }
  });
});

/** Walk src/ collecting files we render to users. */
function marketingFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__' || entry === 'test') continue;
      marketingFiles(full, acc);
    } else if (/\.(tsx?|ts)$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

describe('no fabricated endorsements in shipped source', () => {
  const files = marketingFiles('src');

  // The invented identities that were previously published. A hit outside a
  // comment means someone reintroduced one.
  const INVENTED = [
    'Rodriguez Custom Homes',
    'Metro Build Group',
    'Thompson Construction LLC',
    'Atlantic Builders',
    'Martinez Remodeling',
    'Chang & Associates',
    'Pacific Coast Builders',
    'Martinez General Contracting',
    'Walsh Construction Services',
  ];

  it.each(INVENTED)('does not render the invented customer %s', (name) => {
    const offenders = files.filter((f) => {
      const src = readFileSync(f, 'utf8');
      if (!src.includes(name)) return false;
      // Allow the name inside the documentation comments that record what was
      // removed and why; flag it anywhere it could reach a user.
      return src
        .split('\n')
        .some((line) => line.includes(name) && !line.trimStart().startsWith('*') && !line.trimStart().startsWith('//'));
    });
    expect(offenders, `${name} appears in renderable code`).toEqual([]);
  });

  it('emits no hardcoded aggregateRating outside the claims registry', () => {
    const offenders = files.filter((f) => {
      if (f.endsWith(join('config', 'claims.ts'))) return false;
      const src = readFileSync(f, 'utf8')
        .split('\n')
        .filter((line) => {
          const t = line.trimStart();
          return !t.startsWith('*') && !t.startsWith('//') && !t.startsWith('/*');
        })
        .join('\n');
      // A literal decimal rating is the fabricated pattern; a value read from
      // CLAIMS or computed from stored reviews is fine.
      return /ratingValue["']?\s*[:=]\s*["']?\d+\.\d+/.test(src) && !src.includes('CLAIMS.aggregateRating');
    });
    expect(offenders, 'hardcoded aggregateRating found').toEqual([]);
  });
});
