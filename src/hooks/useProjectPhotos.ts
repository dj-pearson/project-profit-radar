/**
 * Photos behind the project Photos tab (US-331, moved onto a query for US-266).
 *
 * Reads photo_attachments, the record US-330 created, and signs each file's
 * URL. Signed, not public: project-documents is public today only because
 * US-289's flip was never committed, and a page that hardcodes getPublicUrl
 * breaks the day it lands. Signing works either way.
 *
 * A failed list read is thrown for the tab to show. A failed signing batch is
 * logged and skipped: the list still says what exists and when it was taken.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

export interface ProjectPhotoRow {
  id: string;
  file_name: string;
  file_path: string;
  storage_bucket: string;
  caption: string | null;
  taken_at: string | null;
  created_at: string;
  daily_report_id: string | null;
  ai_tags: string[] | null;
  gps_coordinates: unknown;
}

/** Signed URLs last an hour; long enough to browse, short enough not to leak. */
export const SIGNED_URL_TTL_SECONDS = 3600;

export const projectPhotosKey = (companyId: string | undefined, projectId: string) =>
  ['project-photos', companyId, projectId] as const;

export async function fetchProjectPhotos(
  projectId: string,
): Promise<{ photos: ProjectPhotoRow[]; urls: Record<string, string> }> {
  const { data, error } = await supabase
    .from('photo_attachments')
    .select('id, file_name, file_path, storage_bucket, caption, taken_at, created_at, daily_report_id, ai_tags, gps_coordinates')
    .eq('project_id', projectId)
    .order('taken_at', { ascending: false })
    .limit(300);
  if (error) throw error;

  const photos = (data ?? []) as ProjectPhotoRow[];

  // Sign in one batch per bucket rather than one request per photo.
  const byBucket = new Map<string, ProjectPhotoRow[]>();
  for (const row of photos) {
    const bucket = row.storage_bucket || 'project-documents';
    byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), row]);
  }

  const urls: Record<string, string> = {};
  for (const [bucket, bucketRows] of byBucket) {
    const { data: urlData, error: urlError } = await supabase.storage
      .from(bucket)
      .createSignedUrls(bucketRows.map((r) => r.file_path), SIGNED_URL_TTL_SECONDS);
    if (urlError) {
      logger.error(`Could not sign photo URLs in ${bucket}`, urlError);
      continue;
    }
    (urlData ?? []).forEach((entry, i) => {
      if (entry.signedUrl) urls[bucketRows[i].id] = entry.signedUrl;
    });
  }

  return { photos, urls };
}

export function useProjectPhotos(projectId: string) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const query = useQuery({
    queryKey: projectPhotosKey(companyId, projectId),
    queryFn: () => fetchProjectPhotos(projectId),
    enabled: !!projectId,
    // Refetch well before the signed URLs expire.
    staleTime: (SIGNED_URL_TTL_SECONDS / 2) * 1000,
    refetchInterval: (SIGNED_URL_TTL_SECONDS / 2) * 1000,
  });
  return {
    photos: query.data?.photos ?? [],
    urls: query.data?.urls ?? {},
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
