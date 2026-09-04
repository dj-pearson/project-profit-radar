/**
 * Every photo on the job, by date (US-331, on US-330's record).
 *
 * The project hub had no photos section at all. Photos existed only as storage
 * paths in a text[] on individual daily reports, so the answer to "show me the
 * bathroom before it was closed up" was to open daily reports one at a time and
 * guess which day.
 *
 * US-330 made photo_attachments the real record - project, daily report, who
 * took it, when, GPS, caption. This reads it.
 *
 * Signed URLs, not public ones: project-documents is public today only because
 * US-289's flip was never committed, and a page that hardcodes getPublicUrl is
 * a page that breaks the day it lands. Signing works either way.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { Camera, MapPin } from 'lucide-react';

interface PhotoRow {
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
const SIGNED_URL_TTL_SECONDS = 3600;

export function ProjectPhotos({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('photo_attachments')
      .select('id, file_name, file_path, storage_bucket, caption, taken_at, created_at, daily_report_id, ai_tags, gps_coordinates')
      .eq('project_id', projectId)
      .order('taken_at', { ascending: false })
      .limit(300);

    if (error) {
      logger.error('Could not load project photos', error);
      toast({
        variant: 'destructive',
        title: 'Could not load photos',
        description: error.message,
      });
      setPhotos([]);
      setLoading(false);
      return;
    }

    const rows = (data || []) as PhotoRow[];
    setPhotos(rows);

    // Sign in one batch per bucket rather than one request per photo.
    const byBucket = new Map<string, PhotoRow[]>();
    for (const row of rows) {
      const bucket = row.storage_bucket || 'project-documents';
      byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), row]);
    }

    const signed: Record<string, string> = {};
    for (const [bucket, bucketRows] of byBucket) {
      const { data: urlData, error: urlError } = await supabase.storage
        .from(bucket)
        .createSignedUrls(bucketRows.map((r) => r.file_path), SIGNED_URL_TTL_SECONDS);

      if (urlError) {
        // Not fatal: the list still tells you what exists and when it was
        // taken, which beats an empty screen.
        logger.error(`Could not sign photo URLs in ${bucket}`, urlError);
        continue;
      }
      (urlData || []).forEach((entry, i) => {
        if (entry.signedUrl) signed[bucketRows[i].id] = entry.signedUrl;
      });
    }

    setUrls(signed);
    setLoading(false);
  }, [projectId, toast]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return photos;
    return photos.filter((p) =>
      (p.caption ?? '').toLowerCase().includes(q) ||
      p.file_name.toLowerCase().includes(q) ||
      (p.ai_tags ?? []).some((t) => t.toLowerCase().includes(q))
    );
  }, [photos, search]);

  const byDay = useMemo(() => {
    const map = new Map<string, PhotoRow[]>();
    for (const photo of filtered) {
      const day = (photo.taken_at || photo.created_at).slice(0, 10);
      map.set(day, [...(map.get(day) ?? []), photo]);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" aria-hidden="true" />
          Photos
        </CardTitle>
        <CardDescription>
          Every photo on this job, newest first. Taken from daily reports and anywhere
          else the crew uploads.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-sm">
          <Label htmlFor="photo-search">Search</Label>
          <Input
            id="photo-search"
            value={search}
            placeholder="Caption, file name or tag"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : byDay.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {photos.length === 0
              ? 'No photos on this job yet. They appear here as the crew adds them to daily reports.'
              : 'No photo matches that search.'}
          </p>
        ) : (
          <div className="space-y-6">
            {byDay.map(([day, dayPhotos]) => (
              <div key={day}>
                <h3 className="text-sm font-medium mb-2">
                  {new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                  })}
                  <span className="text-muted-foreground font-normal ml-2">
                    {dayPhotos.length} photo{dayPhotos.length === 1 ? '' : 's'}
                  </span>
                </h3>
                <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {dayPhotos.map((photo) => (
                    <li key={photo.id} className="rounded-md border overflow-hidden">
                      {urls[photo.id] ? (
                        <img
                          src={urls[photo.id]}
                          alt={photo.caption || photo.file_name}
                          loading="lazy"
                          className="w-full h-32 object-cover bg-muted"
                        />
                      ) : (
                        <div className="w-full h-32 bg-muted flex items-center justify-center">
                          <Camera className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                        </div>
                      )}
                      <div className="p-2 space-y-1">
                        <p className="text-xs truncate" title={photo.caption || photo.file_name}>
                          {photo.caption || photo.file_name}
                        </p>
                        <div className="flex flex-wrap items-center gap-1">
                          {photo.gps_coordinates != null && (
                            <MapPin className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                          )}
                          {(photo.ai_tags ?? []).slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ProjectPhotos;
