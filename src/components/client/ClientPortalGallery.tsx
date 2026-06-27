import { useMemo, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export interface GalleryReport {
  id: string;
  date: string;
  photos: string[];
}

interface ClientPortalGalleryProps {
  reports: GalleryReport[];
}

/**
 * US-083: Client portal photo gallery.
 *
 * Aggregates photos from the project's daily reports, grouped by date in a
 * thumbnail grid, with a click-to-enlarge lightbox.
 */
export function ClientPortalGallery({ reports }: ClientPortalGalleryProps) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  const groups = useMemo(
    () =>
      reports
        .filter((r) => Array.isArray(r.photos) && r.photos.length > 0)
        .map((r) => ({ id: r.id, date: r.date, photos: r.photos }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [reports]
  );

  const total = groups.reduce((sum, g) => sum + g.photos.length, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Photos</CardTitle>
        <CardDescription>Photos from your project's daily reports</CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="py-8 text-center">
            <ImageIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No photos available yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((g) => (
              <div key={g.id}>
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  {new Date(g.date).toLocaleDateString()}
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                  {g.photos.map((url, i) => (
                    <button
                      key={`${g.id}-${i}`}
                      type="button"
                      onClick={() => setLightbox(url)}
                      className="aspect-square overflow-hidden rounded-md border transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`View photo ${i + 1} from ${new Date(g.date).toLocaleDateString()}`}
                    >
                      <img src={url} alt={`Project photo ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
          <DialogContent className="max-w-3xl p-2">
            {lightbox && (
              <img src={lightbox} alt="Project photo" className="max-h-[80vh] w-full rounded object-contain" />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default ClientPortalGallery;
