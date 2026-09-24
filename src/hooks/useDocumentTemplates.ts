/**
 * Company document templates: list, upload, edit, delete and clone into a
 * project (US-266, US-366).
 *
 * The page's project picker read ignored its error, so a failed read showed
 * an empty "Select a project" list with nothing said. Edit and delete did not
 * read back: an edit RLS filtered to zero rows toasted "Template updated", and
 * delete removed the file from storage before the row, so a refused row
 * delete left a template whose file was gone. The row goes first now, and
 * every write throws when no row came back.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { documentKindFields, documentKindFilter, findDocumentCategoryId } from '@/lib/documentKinds';

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string | null;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
}

export const TEMPLATE_BUCKET = 'company-documents';

export const documentTemplatesKey = (companyId: string | undefined) => ['document-templates', companyId] as const;
export const templateProjectsKey = (companyId: string | undefined) =>
  ['document-templates', companyId, 'projects'] as const;

export async function fetchDocumentTemplates(companyId: string): Promise<DocumentTemplate[]> {
  // US-366: `documents` has no document_type column. A template is a document
  // in the company's "Templates" document_category, or tagged 'template' when
  // the category couldn't be created at upload time. Reasoning for
  // category_id over a new column is in src/lib/documentKinds.ts.
  const categoryId = await findDocumentCategoryId(companyId, 'template');
  const { data, error } = await supabase
    .from('documents')
    .select('id, name, description, file_path, file_type, file_size, category_id, company_id')
    .eq('company_id', companyId)
    .or(documentKindFilter('template', categoryId))
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as DocumentTemplate[]) ?? [];
}

export async function fetchTemplateProjects(companyId: string): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name')
    .eq('company_id', companyId)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

const extOf = (name: string) => name.split('.').pop();

export async function uploadTemplate(
  companyId: string,
  userId: string | undefined,
  v: { file: File; name: string; description: string },
): Promise<void> {
  const path = `${companyId}/templates/${Date.now()}-${crypto.randomUUID()}.${extOf(v.file.name)}`;
  const { error: upErr } = await supabase.storage.from(TEMPLATE_BUCKET).upload(path, v.file);
  if (upErr) throw upErr;
  const kindFields = await documentKindFields(companyId, 'template');
  const { data, error } = await supabase
    .from('documents')
    .insert([
      {
        name: v.name.trim() || v.file.name,
        description: v.description || null,
        file_path: path,
        file_type: v.file.type || 'application/octet-stream',
        file_size: v.file.size,
        company_id: companyId,
        uploaded_by: userId,
        ...kindFields,
        is_current_version: true,
      },
    ])
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('The template file uploaded but its record was not saved.');
}

export async function updateTemplate(
  companyId: string,
  id: string,
  patch: { name: string; description: string | null },
): Promise<void> {
  const { data, error } = await supabase
    .from('documents')
    .update(patch)
    .eq('id', id)
    .eq('company_id', companyId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The template was not updated. It may have been deleted, or you may not have permission.');
  }
}

export async function deleteTemplate(companyId: string, t: DocumentTemplate): Promise<void> {
  const { data, error } = await supabase
    .from('documents')
    .delete()
    .eq('id', t.id)
    .eq('company_id', companyId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The template was not deleted. It may already be gone, or you may not have permission.');
  }
  // The row is gone, so the template is gone for everyone. A file left
  // behind is storage waste, not a broken template, and is logged.
  const { error: rmErr } = await supabase.storage.from(TEMPLATE_BUCKET).remove([t.file_path]);
  if (rmErr) logger.warn('Template row deleted but its file was not removed', { path: t.file_path, error: rmErr.message });
}

export async function cloneTemplate(
  companyId: string,
  userId: string | undefined,
  t: DocumentTemplate,
  projectId: string,
): Promise<void> {
  // Copy the underlying file into the project documents bucket.
  const { data: blob, error: dlErr } = await supabase.storage.from(TEMPLATE_BUCKET).download(t.file_path);
  if (dlErr || !blob) throw dlErr ?? new Error('Download failed');

  const newPath = `${projectId}/${Date.now()}-${crypto.randomUUID()}.${extOf(t.file_path)}`;
  const { error: upErr } = await supabase.storage.from('project-documents').upload(newPath, blob);
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from('documents')
    .insert([
      {
        name: `Copy of ${t.name}`,
        description: t.description,
        file_path: newPath,
        file_type: t.file_type,
        file_size: t.file_size,
        company_id: companyId,
        project_id: projectId,
        uploaded_by: userId,
        // A clone is an ordinary project document: no template category/tag.
        is_current_version: true,
      },
    ])
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('The copy was uploaded but its record was not saved.');
}

export function useDocumentTemplates() {
  const { user, userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const userId = user?.id;
  const queryClient = useQueryClient();

  const templates = useQuery({
    queryKey: documentTemplatesKey(companyId),
    queryFn: () => fetchDocumentTemplates(companyId as string),
    enabled: !!companyId,
  });
  const projects = useQuery({
    queryKey: templateProjectsKey(companyId),
    queryFn: () => fetchTemplateProjects(companyId as string),
    enabled: !!companyId,
  });

  const need = () => {
    if (!companyId) throw new Error('Your profile is not linked to a company.');
    return companyId;
  };
  const invalidate = () => queryClient.invalidateQueries({ queryKey: documentTemplatesKey(companyId) });

  const upload = useMutation({
    mutationFn: (v: { file: File; name: string; description: string }) => uploadTemplate(need(), userId, v),
    onSettled: invalidate,
  });
  const update = useMutation({
    mutationFn: (v: { id: string; patch: { name: string; description: string | null } }) =>
      updateTemplate(need(), v.id, v.patch),
    onSettled: invalidate,
  });
  const remove = useMutation({
    mutationFn: (t: DocumentTemplate) => deleteTemplate(need(), t),
    onSettled: invalidate,
  });
  const clone = useMutation({
    mutationFn: (v: { template: DocumentTemplate; projectId: string }) =>
      cloneTemplate(need(), userId, v.template, v.projectId),
    // The copy is a project document, not a template.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['documents', companyId] }),
  });

  return { companyId, templates, projects, upload, update, remove, clone };
}
