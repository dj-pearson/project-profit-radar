/**
 * Duplicate Detection Service
 * Handles finding existing records that match import data
 */

import { supabase } from '@/integrations/supabase/client';
import { CSV_TEMPLATES, CSVTemplate } from './templates';

export interface DuplicateMatch {
  importIndex: number;
  importRecord: Record<string, any>;
  existingRecord: Record<string, any>;
  matchedFields: string[];
  matchScore: number; // 0-100, how confident we are in the match
}

export interface DuplicateCheckResult {
  duplicates: DuplicateMatch[];
  newRecords: Array<{ index: number; record: Record<string, any> }>;
  totalRecords: number;
}

export type DuplicateResolution = 'merge' | 'create_new' | 'skip';

export interface ResolvedDuplicate {
  importIndex: number;
  resolution: DuplicateResolution;
  existingId?: string;
  mergedData?: Record<string, any>;
}

/**
 * Check for duplicates in import data against existing database records
 */
export async function checkForDuplicates(
  dataType: string,
  importData: Record<string, any>[],
  companyId: string
): Promise<DuplicateCheckResult> {
  const template = CSV_TEMPLATES[dataType];
  if (!template) {
    return {
      duplicates: [],
      newRecords: importData.map((record, index) => ({ index, record })),
      totalRecords: importData.length,
    };
  }

  const duplicates: DuplicateMatch[] = [];
  const newRecords: Array<{ index: number; record: Record<string, any> }> = [];

  // Build match fields based on template
  const matchFields = template.duplicateMatchFields;

  // Fetch existing records for comparison
  const existingRecords = await fetchExistingRecords(template, companyId);

  for (let i = 0; i < importData.length; i++) {
    const importRecord = importData[i];
    const match = findBestMatch(importRecord, existingRecords, matchFields, template);

    if (match) {
      duplicates.push({
        importIndex: i,
        importRecord,
        existingRecord: match.record,
        matchedFields: match.matchedFields,
        matchScore: match.score,
      });
    } else {
      newRecords.push({ index: i, record: importRecord });
    }
  }

  return {
    duplicates,
    newRecords,
    totalRecords: importData.length,
  };
}

/**
 * Fetch existing records from the database for duplicate checking
 */
async function fetchExistingRecords(
  template: CSVTemplate,
  companyId: string
): Promise<Record<string, any>[]> {
  try {
    // Select only the fields we need for matching plus id
    const selectFields = ['id', ...template.duplicateMatchFields].join(',');

    const { data, error } = await supabase
      .from(template.tableName)
      .select(selectFields)
      .eq('company_id', companyId)
      .limit(10000); // Reasonable limit for comparison

    if (error) {
      console.error('Error fetching existing records:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchExistingRecords:', error);
    return [];
  }
}

/**
 * Find the best matching existing record for an import record
 */
function findBestMatch(
  importRecord: Record<string, any>,
  existingRecords: Record<string, any>[],
  matchFields: string[],
  template: CSVTemplate
): { record: Record<string, any>; matchedFields: string[]; score: number } | null {
  let bestMatch: { record: Record<string, any>; matchedFields: string[]; score: number } | null = null;

  for (const existing of existingRecords) {
    const matchedFields: string[] = [];
    let matchCount = 0;
    let importFieldCount = 0;

    for (const field of matchFields) {
      // Get the import value - might be using display name or db field
      const fieldDef = template.fields.find(f => f.dbField === field);
      const importValue = importRecord[field] ||
        (fieldDef ? importRecord[fieldDef.name] : null);
      const existingValue = existing[field];

      if (importValue && existingValue) {
        importFieldCount++;
        // Normalize strings for comparison
        const normalizedImport = normalizeValue(importValue);
        const normalizedExisting = normalizeValue(existingValue);

        if (normalizedImport === normalizedExisting) {
          matchCount++;
          matchedFields.push(field);
        } else if (isFuzzyMatch(normalizedImport, normalizedExisting)) {
          // Partial match for fuzzy matching
          matchCount += 0.5;
          matchedFields.push(`${field} (partial)`);
        }
      }
    }

    // Calculate match score
    if (importFieldCount > 0 && matchCount > 0) {
      const score = Math.round((matchCount / matchFields.length) * 100);

      // Only consider matches with score >= 50%
      if (score >= 50 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = {
          record: existing,
          matchedFields,
          score,
        };
      }
    }
  }

  return bestMatch;
}

/**
 * Normalize a value for comparison
 */
function normalizeValue(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Check if two values are a fuzzy match (Levenshtein distance based)
 */
function isFuzzyMatch(a: string, b: string): boolean {
  if (!a || !b) return false;

  // If strings are very different lengths, not a match
  if (Math.abs(a.length - b.length) > Math.max(a.length, b.length) * 0.3) {
    return false;
  }

  // Simple similarity check - contains or starts with
  if (a.includes(b) || b.includes(a)) return true;
  if (a.startsWith(b.substring(0, 5)) || b.startsWith(a.substring(0, 5))) return true;

  // Levenshtein distance for similar strings
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  const similarity = 1 - distance / maxLength;

  return similarity >= 0.8; // 80% similarity threshold
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1, // substitution
          dp[i - 1][j] + 1,     // deletion
          dp[i][j - 1] + 1      // insertion
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Merge import data with existing record
 * New data takes precedence for non-empty values
 */
export function mergeRecords(
  existingRecord: Record<string, any>,
  importRecord: Record<string, any>,
  template: CSVTemplate
): Record<string, any> {
  const merged: Record<string, any> = { ...existingRecord };

  for (const field of template.fields) {
    const importValue = importRecord[field.dbField] || importRecord[field.name];

    // Only update if import has a non-empty value
    if (importValue !== null && importValue !== undefined && importValue !== '') {
      // Skip system fields
      if (!field.dbField.startsWith('_')) {
        merged[field.dbField] = importValue;
      }
    }
  }

  // Always preserve the existing ID and timestamps
  merged.id = existingRecord.id;
  merged.created_at = existingRecord.created_at;
  merged.updated_at = new Date().toISOString();

  return merged;
}

/**
 * Apply user resolutions to import data
 * Returns records ready for insert and update
 */
export function applyResolutions(
  duplicateResult: DuplicateCheckResult,
  resolutions: ResolvedDuplicate[],
  template: CSVTemplate
): {
  toInsert: Record<string, any>[];
  toUpdate: Array<{ id: string; data: Record<string, any> }>;
  skipped: number;
} {
  const toInsert: Record<string, any>[] = [];
  const toUpdate: Array<{ id: string; data: Record<string, any> }> = [];
  let skipped = 0;

  // Handle new records (no duplicates)
  for (const { record } of duplicateResult.newRecords) {
    toInsert.push(record);
  }

  // Handle duplicates based on resolutions
  for (const duplicate of duplicateResult.duplicates) {
    const resolution = resolutions.find(r => r.importIndex === duplicate.importIndex);

    if (!resolution) {
      // Default to skip if no resolution provided
      skipped++;
      continue;
    }

    switch (resolution.resolution) {
      case 'merge':
        const merged = mergeRecords(
          duplicate.existingRecord,
          duplicate.importRecord,
          template
        );
        toUpdate.push({
          id: duplicate.existingRecord.id,
          data: merged,
        });
        break;

      case 'create_new':
        toInsert.push(duplicate.importRecord);
        break;

      case 'skip':
      default:
        skipped++;
        break;
    }
  }

  return { toInsert, toUpdate, skipped };
}
