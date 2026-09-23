/**
 * Reads and writes the company subcontractor list (US-405).
 *
 * The tables come from supabase/migrations/20260924110000_subcontractors.sql
 * and are not in the generated types until that migration is applied and
 * `npm run db:types` is re-run, so queries go through an untyped client and
 * the rows are typed by src/lib/subcontractors.ts instead.
 *
 * A database without the tables yet is reported as `available: false` rather
 * than as an empty list, so the page can say so instead of showing "No
 * subcontractors yet" to someone whose list simply cannot be read.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  CERTIFICATE_FILE_TYPES,
  CERTIFICATE_MAX_BYTES,
  certificateFormSchema,
  certificateStoragePath,
  isMissingTableError,
  toSubcontractor,
  toSubcontractorColumns,
  type CertificateFormValues,
  type CertificateRow,
  type PrequalificationState,
  type Subcontractor,
  type SubcontractorFormValues,
  type SubcontractorRow,
} from '@/lib/subcontractors';
import { validateFileUpload } from '@/lib/security/fileUploadValidation';

const db = () => supabase as unknown as SupabaseClient;

/** Roles the RLS "manage" policies allow to write. Keep in step with the migration. */
export const SUBCONTRACTOR_MANAGER_ROLES = ['root_admin', 'admin', 'project_manager', 'office_staff'];

export const subcontractorsKey = (companyId: string | undefined) => ['subcontractors', companyId] as const;

export interface SubcontractorList {
  available: boolean;
  subcontractors: Subcontractor[];
}

export async function fetchSubcontractors(companyId: string): Promise<SubcontractorList> {
  const subsRes = await db()
    .from('subcontractors')
    .select('id, company_id, name, trade, contact_name, phone, email, license_number, rating, notes, prequalification, is_active, created_at, updated_at')
    .eq('company_id', companyId)
    .order('name');
  if (subsRes.error) {
    if (isMissingTableError(subsRes.error)) return { available: false, subcontractors: [] };
    throw subsRes.error;
  }
  const rows = (subsRes.data ?? []) as SubcontractorRow[];

  const certsRes = await db()
    .from('subcontractor_insurance_certificates')
    .select('id, company_id, subcontractor_id, coverage_type, file_path, file_name, expires_on, created_at')
    .eq('company_id', companyId);
  if (certsRes.error) {
    if (isMissingTableError(certsRes.error)) return { available: false, subcontractors: [] };
    // A list with every vendor showing "No certificate" because the read failed
    // would tell the user their insurance tracking is empty. It is an error.
    throw certsRes.error;
  }
  const certs = (certsRes.data ?? []) as CertificateRow[];

  return { available: true, subcontractors: rows.map((r) => toSubcontractor(r, certs)) };
}

export async function createSubcontractor(
  companyId: string,
  userId: string | undefined,
  values: SubcontractorFormValues,
): Promise<SubcontractorRow> {
  const { data, error } = await db()
    .from('subcontractors')
    .insert({ ...toSubcontractorColumns(values), company_id: companyId, created_by: userId ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as SubcontractorRow;
}

export type SubcontractorPatch =
  | { kind: 'details'; values: SubcontractorFormValues }
  | { kind: 'rating'; rating: number }
  | { kind: 'prequalification'; prequalification: PrequalificationState };

export function patchColumns(patch: SubcontractorPatch): Record<string, unknown> {
  switch (patch.kind) {
    case 'details':
      return toSubcontractorColumns(patch.values);
    case 'rating': {
      const r = Math.round(patch.rating);
      if (!Number.isFinite(r) || r < 0 || r > 5) throw new Error('A rating is 0 to 5 stars');
      return { rating: r };
    }
    case 'prequalification':
      return { prequalification: patch.prequalification };
  }
}

export async function updateSubcontractor(id: string, patch: SubcontractorPatch): Promise<void> {
  // .select() so an update RLS filtered to zero rows is an error, not a quiet no-op.
  const { data, error } = await db()
    .from('subcontractors')
    .update(patchColumns(patch))
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('That change was not saved. You may not have permission to edit subcontractors.');
  }
}

export async function deleteSubcontractor(sub: Pick<Subcontractor, 'id' | 'insuranceCertificates'>): Promise<void> {
  const { data, error } = await db().from('subcontractors').delete().eq('id', sub.id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('That subcontractor was not deleted. You may not have permission to delete subcontractors.');
  }
  // Certificate rows go with the vendor (ON DELETE CASCADE); the files do not.
  const paths = sub.insuranceCertificates.map((c) => c.filePath);
  if (paths.length > 0) {
    const { error: removeError } = await supabase.storage.from('subcontractor-documents').remove(paths);
    if (removeError) {
      throw new Error(
        `The subcontractor was deleted, but ${paths.length} certificate file(s) could not be removed: ${removeError.message}`,
      );
    }
  }
}

export interface UploadCertificateInput {
  companyId: string;
  userId: string | undefined;
  subcontractorId: string;
  file: File;
  values: CertificateFormValues;
}

export function validateCertificateFile(file: File): string | null {
  const result = validateFileUpload(file, {
    allowedTypes: CERTIFICATE_FILE_TYPES,
    allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSize: CERTIFICATE_MAX_BYTES,
  });
  return result.valid ? null : result.error ?? 'That file cannot be uploaded.';
}

export async function uploadCertificate(input: UploadCertificateInput): Promise<void> {
  const values = certificateFormSchema.parse(input.values);
  const fileError = validateCertificateFile(input.file);
  if (fileError) throw new Error(fileError);

  const path = certificateStoragePath(input.companyId, input.subcontractorId, input.file.name);
  const bucket = supabase.storage.from('subcontractor-documents');
  const { error: uploadError } = await bucket.upload(path, input.file, {
    contentType: input.file.type,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { error } = await db().from('subcontractor_insurance_certificates').insert({
    company_id: input.companyId,
    subcontractor_id: input.subcontractorId,
    coverage_type: values.coverageType,
    file_path: path,
    file_name: input.file.name,
    expires_on: values.expiresOn,
    created_by: input.userId ?? null,
  });
  if (error) {
    // No row points at the file, so nothing would ever show or clean it up.
    await bucket.remove([path]);
    throw error;
  }
}

export async function deleteCertificate(cert: { id: string; filePath: string }): Promise<void> {
  const { data, error } = await db()
    .from('subcontractor_insurance_certificates')
    .delete()
    .eq('id', cert.id)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('That certificate was not removed. You may not have permission to edit subcontractors.');
  }
  const { error: removeError } = await supabase.storage.from('subcontractor-documents').remove([cert.filePath]);
  if (removeError) {
    throw new Error(`The certificate record was removed, but its file could not be deleted: ${removeError.message}`);
  }
}

// --- Hooks --------------------------------------------------------------

export function useSubcontractors() {
  const { userProfile, user } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = subcontractorsKey(companyId);
  const canManage = !!userProfile?.role && SUBCONTRACTOR_MANAGER_ROLES.includes(userProfile.role);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchSubcontractors(companyId as string),
    enabled: !!companyId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const requireCompany = () => {
    if (!companyId) throw new Error('Your account is not linked to a company, so there is nowhere to save this.');
    return companyId;
  };

  const create = useMutation({
    mutationFn: (values: SubcontractorFormValues) => createSubcontractor(requireCompany(), user?.id, values),
    onSettled: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: SubcontractorPatch }) => updateSubcontractor(id, patch),
    // Ratings and checkboxes should move when clicked; roll back if the write fails.
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<SubcontractorList>(key);
      if (previous && patch.kind !== 'details') {
        queryClient.setQueryData<SubcontractorList>(key, {
          ...previous,
          subcontractors: previous.subcontractors.map((s) =>
            s.id !== id
              ? s
              : patch.kind === 'rating'
                ? { ...s, rating: patch.rating }
                : { ...s, prequalification: patch.prequalification },
          ),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: (sub: Subcontractor) => deleteSubcontractor(sub),
    onSettled: invalidate,
  });

  const addCertificate = useMutation({
    mutationFn: (input: Omit<UploadCertificateInput, 'companyId' | 'userId'>) =>
      uploadCertificate({ ...input, companyId: requireCompany(), userId: user?.id }),
    onSettled: invalidate,
  });

  const removeCertificate = useMutation({
    mutationFn: (cert: { id: string; filePath: string }) => deleteCertificate(cert),
    onSettled: invalidate,
  });

  return {
    subcontractors: query.data?.subcontractors ?? [],
    available: query.data?.available ?? true,
    isLoading: query.isLoading || (!companyId && !userProfile),
    error: query.error as Error | null,
    refetch: query.refetch,
    hasCompany: !!companyId,
    canManage,
    create,
    update,
    remove,
    addCertificate,
    removeCertificate,
  };
}
