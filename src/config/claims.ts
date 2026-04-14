/**
 * Marketing & social-proof claims registry.
 *
 * Centralizes every numeric or superlative claim about Brikly so legal /
 * marketing can audit them in one place. Each claim has a `verified` flag —
 * UI components MUST check it before rendering, and structured-data
 * generators (JSON-LD aggregate ratings, etc.) MUST omit the entire field
 * when verified is false.
 *
 * Why this exists
 * ---------------
 * Google rich results (aggregateRating, reviewCount), the FTC Endorsement
 * Guides, FTC Act §5 (UDAAP), and the FTC's "Made-In-USA" / "Made With"
 * guidance all require advertisers to have substantiation in hand BEFORE
 * publishing performance, popularity, or customer-count claims. Embedding
 * unsupported numbers ("4.8 stars from 247 reviews", "500+ contractors")
 * in source code so they ship to production indexed pages creates direct
 * FTC and state-AG exposure.
 *
 * How to enable a claim
 * ---------------------
 * 1. Confirm the claim is currently true (e.g., pull the actual review count
 *    or active customer count from the database).
 * 2. Save the supporting evidence (CSV export, screenshot, contract list,
 *    survey methodology) to legal's substantiation folder.
 * 3. Update the value here, set `verified: true`, and bump `lastVerifiedAt`.
 *
 * If a claim is no longer true (e.g., review count dropped) flip
 * `verified` back to false rather than editing the number — that preserves
 * the audit trail.
 */

export interface VerifiableClaim<T = unknown> {
  /** True iff the claim is currently substantiated and safe to render. */
  verified: boolean;
  /** ISO date the substantiation was last reviewed. */
  lastVerifiedAt?: string;
  /** Where the supporting evidence lives (link or short description). */
  source?: string;
  /** The actual claim value when verified. */
  value: T;
}

export interface AggregateRatingClaim {
  ratingValue: number;
  reviewCount: number;
  bestRating: number;
  worstRating: number;
}

/**
 * Claims registry. Defaults are intentionally `verified: false`. Update each
 * claim only after legal sign-off (see file header).
 */
export const CLAIMS = {
  /** Aggregate review rating used in JSON-LD productSchema. */
  aggregateRating: {
    verified: false,
    source: 'Pending: G2 / Capterra / internal NPS export',
    value: {
      ratingValue: 4.8,
      reviewCount: 247,
      bestRating: 5,
      worstRating: 1,
    },
  } satisfies VerifiableClaim<AggregateRatingClaim>,

  /** Number of paying customers / active contractors. */
  customerCount: {
    verified: false,
    source: 'Pending: production query of active subscriptions',
    value: '500+',
  } satisfies VerifiableClaim<string>,

  /** Average margin improvement claimed by SocialProof / Hero. */
  marginImprovement: {
    verified: false,
    source: 'Pending: customer outcome study with documented methodology',
    value: '23%',
  } satisfies VerifiableClaim<string>,

  /** Hours saved per project (Hero). */
  hoursSavedPerProject: {
    verified: false,
    source: 'Pending: time-tracking benchmark study',
    value: '15+ hrs',
  } satisfies VerifiableClaim<string>,
} as const;

/**
 * Helper that returns the claim's value if verified, otherwise the fallback.
 * Use in JSX:
 *
 *   <p>{ifVerified(CLAIMS.customerCount, 'a growing community of contractors')}</p>
 */
export function ifVerified<T>(claim: VerifiableClaim<T>, fallback: T): T {
  return claim.verified ? claim.value : fallback;
}

/**
 * Helper for JSON-LD: returns the claim object if verified, otherwise
 * undefined so the schema field is omitted entirely. Google's structured-data
 * guidelines require the data to be true, present, and visible to users.
 */
export function ifVerifiedSchema<T>(claim: VerifiableClaim<T>): T | undefined {
  return claim.verified ? claim.value : undefined;
}
