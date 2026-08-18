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

describe('no unsubstantiated outcome claims on marketing surfaces', () => {
  const files = marketingFiles('src');

  /**
   * Claims we may keep because a named third party is credited inline, and the
   * reader can go check them. CFMA is the Construction Financial Management
   * Association.
   */
  const ATTRIBUTED = /CFMA|Construction Financial Management Association|BLS|Bureau of Labor/;

  /**
   * Files that legitimately contain percentages which are not marketing
   * claims: in-app dashboards showing a customer's own numbers, and the ROI
   * calculator whose assumptions are named and disclosed on the page.
   */
  const NOT_MARKETING = [
    'ROICalculator',
    'AIQualityControl',
    'TeamPerformanceTracking',
    'ProjectProfitLoss',
    'SocialMediaScheduler',
    'CaseStudiesSection',
    'RealTimeBudgeting',
    'JobCosting',
    'RealCostDelayedJobCosting',
    'FinancialIntelligenceGuide',
    // Internal prediction model, not marketing copy.
    'costPrediction',
  ];

  it('asserts no outcome percentage without an inline source', () => {
    // Pricing comparisons against a competitor ("60% lower cost than Procore")
    // are verifiable arithmetic from published pricing and are out of scope --
    // this guard is about performance outcomes we would have to have measured.
    const PRICING = /%\s+(lower|less|cheaper)\s+(cost|price|pricing)/i;
    const OUTCOME = /\b\d{1,3}(-\d{1,3})?%\s+(fewer|faster|more|higher|better|reduction|improvement|increase)\b/i;
    const offenders: string[] = [];

    for (const file of files) {
      if (NOT_MARKETING.some((n) => file.includes(n))) continue;
      const src = readFileSync(file, 'utf8');
      for (const line of src.split('\n')) {
        const t = line.trimStart();
        if (t.startsWith('*') || t.startsWith('//')) continue;
        if (OUTCOME.test(line) && !ATTRIBUTED.test(line) && !PRICING.test(line)) {
          offenders.push(`${file}: ${line.trim().slice(0, 90)}`);
        }
      }
    }

    expect(offenders, 'unsubstantiated outcome claim').toEqual([]);
  });

  it('makes no "most contractors see N% ROI" style return promise', () => {
    // A rubric explaining how to read the ROI you just calculated ("200-300%
    // ROI: good investment") is legitimate. Telling the reader what they will
    // get is the claim that needs substantiation.
    const PROMISE = /(most contractors|customers|contractors|you can)[^.]{0,60}\b(see|expect|achieve|deliver|typically)\b[^.]{0,40}\d{2,3}(-\d{2,3})?%\s*ROI/i;
    const offenders = files.filter((f) => PROMISE.test(readFileSync(f, 'utf8')));
    expect(offenders, 'unsubstantiated ROI promise').toEqual([]);
  });

  it('does not claim customer telemetry Brikly has never collected', () => {
    const PHRASES = [/Brikly users report/i, /Brikly customers typically save/i];
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      if (PHRASES.some((p) => p.test(src))) offenders.push(file);
    }
    expect(offenders, 'claims measured customer outcomes').toEqual([]);
  });
});

