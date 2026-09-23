/**
 * Document "kinds" (template, RFI attachment) on the `documents` table.
 *
 * US-366. Several callers wrote and filtered a `documents.document_type`
 * column that does not exist: types.ts `documents.Row` has `category_id`
 * (FK to document_categories) and no document_type, and no migration adds one
 * to `documents` (the document_type columns in migrations belong to other
 * tables). PostgREST rejected every one of those queries, so template upload,
 * the template list, RFI attachments and document search all failed.
 *
 * Decision: map the kind onto `category_id` rather than add a column. The
 * category table already exists per company (company_id, name), the FK is in
 * the live schema, and it needs no migration or types.ts regeneration.
 * The catch is RLS: only admin / project_manager / office_staff may insert
 * into document_categories, so a client_portal user can't create the
 * category. When the category can't be found or created the row goes in with
 * category_id null and the kind in `tags` (text[], already on the table).
 * Every write carries the tag too, so readers match `category_id = X OR tags
 * contains kind` and never lose a row written by the fallback path.
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export type DocumentKind = 'template' | 'rfi-attachment';

export const DOCUMENT_KIND_CATEGORY: Record<DocumentKind, { name: string; description: string }> = {
  template: { name: 'Templates', description: 'Reusable document templates' },
  'rfi-attachment': { name: 'RFI Attachments', description: 'Files attached to client RFIs' },
};

/** Looks up the kind's category for the company. null when absent or unreadable. */
export async function findDocumentCategoryId(
  companyId: string,
  kind: DocumentKind,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('document_categories')
    .select('id')
    .eq('company_id', companyId)
    .ilike('name', DOCUMENT_KIND_CATEGORY[kind].name)
    .limit(1);
  if (error) {
    logger.warn(`document_categories lookup failed for ${kind}: ${error.message}`);
    return null;
  }
  return data?.[0]?.id ?? null;
}

/**
 * Finds the kind's category, creating it when RLS allows. Returns null (never
 * throws) when it can't, and the caller falls back to the tag alone.
 */
export async function ensureDocumentCategoryId(
  companyId: string,
  kind: DocumentKind,
): Promise<string | null> {
  const existing = await findDocumentCategoryId(companyId, kind);
  if (existing) return existing;
  const { name, description } = DOCUMENT_KIND_CATEGORY[kind];
  const { data, error } = await supabase
    .from('document_categories')
    .insert([{ company_id: companyId, name, description, is_active: true }])
    .select('id')
    .single();
  if (error) {
    // Expected for client_portal users (RLS). The tag still marks the row.
    logger.warn(`Could not create document category ${name}: ${error.message}`);
    return null;
  }
  return data?.id ?? null;
}

/** The columns a documents insert needs to record its kind. */
export async function documentKindFields(
  companyId: string,
  kind: DocumentKind,
): Promise<{ category_id: string | null; tags: string[] }> {
  return { category_id: await ensureDocumentCategoryId(companyId, kind), tags: [kind] };
}

/** PostgREST `or` filter matching documents of this kind. */
export function documentKindFilter(kind: DocumentKind, categoryId: string | null): string {
  const byTag = `tags.cs.{${kind}}`;
  return categoryId ? `category_id.eq.${categoryId},${byTag}` : byTag;
}
