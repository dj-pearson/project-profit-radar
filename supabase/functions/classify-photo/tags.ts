/**
 * What a job-site photo can be tagged with (US-046, delivered through US-330).
 *
 * A fixed vocabulary rather than whatever the model says, because the tags are
 * for finding photos later: "framing" and "Framing" and "wood framing" as three
 * tags is three searches. The model is asked to choose from this list, and its
 * answer is filtered to it, so a creative reply costs a tag rather than
 * polluting the index.
 *
 * No Deno or network imports: the edge function and the unit tests both load
 * this file.
 */

export const PHOTO_TAGS = [
  // Trade / phase
  'site-prep', 'excavation', 'foundation', 'concrete', 'framing', 'roofing',
  'siding', 'windows-doors', 'plumbing', 'electrical', 'hvac', 'insulation',
  'drywall', 'painting', 'flooring', 'tile', 'cabinets', 'countertops',
  'landscaping', 'paving', 'demolition', 'masonry', 'steel',
  // What the photo documents
  'progress', 'delivery', 'equipment', 'safety-hazard', 'ppe', 'damage',
  'defect', 'inspection', 'weather', 'cleanup', 'before', 'after',
  // Where
  'interior', 'exterior', 'aerial',
] as const;

export type PhotoTag = (typeof PHOTO_TAGS)[number];

const ALLOWED = new Set<string>(PHOTO_TAGS);
export const MAX_TAGS_PER_PHOTO = 6;

export interface PhotoClassification {
  tags: PhotoTag[];
  /** 0..1, three decimals, matching photo_attachments.ai_confidence NUMERIC(4,3). */
  confidence: number | null;
}

const normalize = (tag: string) =>
  tag.toLowerCase().trim().replace(/[\s_/]+/g, '-').replace(/[^a-z-]/g, '');

/**
 * Read the model's answer. Accepts the JSON object the prompt asks for, with or
 * without a markdown fence around it. Returns null when there is nothing
 * usable, so the caller leaves the photo unclassified rather than recording
 * "classified, no tags", which would stop it being retried.
 */
export function parseClassification(raw: string | null | undefined): PhotoClassification | null {
  if (!raw) return null;
  const body = raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const { tags, confidence } = parsed as { tags?: unknown; confidence?: unknown };
  if (!Array.isArray(tags)) return null;

  const seen = new Set<string>();
  const kept: PhotoTag[] = [];
  for (const t of tags) {
    if (typeof t !== 'string') continue;
    const n = normalize(t);
    if (ALLOWED.has(n) && !seen.has(n)) {
      seen.add(n);
      kept.push(n as PhotoTag);
    }
    if (kept.length >= MAX_TAGS_PER_PHOTO) break;
  }

  const c = typeof confidence === 'number' && Number.isFinite(confidence)
    ? Math.round(Math.min(Math.max(confidence, 0), 1) * 1000) / 1000
    : null;

  return { tags: kept, confidence: c };
}

export const CLASSIFY_PROMPT =
  'You are tagging a construction job-site photo so it can be found later. ' +
  'Choose up to ' + MAX_TAGS_PER_PHOTO + ' tags from this list and no others: ' +
  PHOTO_TAGS.join(', ') + '. ' +
  'Reply with only a JSON object: {"tags": [...], "confidence": <0 to 1>}.';
