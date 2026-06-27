import { useEffect, useState } from 'react';
import { Download, Share2, Loader2, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export interface PreviewableDocument {
  name: string;
  file_path: string;
  file_type?: string | null;
}

interface DocumentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: PreviewableDocument | null;
  /** Storage bucket the file lives in (e.g. 'project-documents' | 'company-documents'). */
  bucket: string;
}

const SHARE_EXPIRY_OPTIONS: { label: string; seconds: number }[] = [
  { label: '24 hours', seconds: 24 * 60 * 60 },
  { label: '7 days', seconds: 7 * 24 * 60 * 60 },
  { label: '30 days', seconds: 30 * 24 * 60 * 60 },
];

const isPdf = (doc: PreviewableDocument) =>
  (doc.file_type ?? '').includes('pdf') || doc.name.toLowerCase().endsWith('.pdf');

const isImage = (doc: PreviewableDocument) =>
  (doc.file_type ?? '').startsWith('image/') ||
  /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(doc.name);

/**
 * US-081: Inline document preview.
 *
 * Renders PDFs in an iframe and images directly (no download needed), with
 * Download / Share / Close actions. Share generates a time-limited Supabase
 * signed URL (24h / 7d / 30d) and copies it to the clipboard.
 */
export function DocumentPreviewModal({ open, onOpenChange, document, bucket }: DocumentPreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expiry, setExpiry] = useState(String(SHARE_EXPIRY_OPTIONS[0].seconds));
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!open || !document) {
      setPreviewUrl(null);
      return;
    }
    setLoading(true);
    supabase.storage
      .from(bucket)
      .createSignedUrl(document.file_path, 60 * 60)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data?.signedUrl) {
          logger.error('Failed to create preview URL', error as Error);
          setPreviewUrl(null);
        } else {
          setPreviewUrl(data.signedUrl);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, document, bucket]);

  const handleDownload = async () => {
    if (!document) return;
    try {
      const { data, error } = await supabase.storage.from(bucket).download(document.file_path);
      if (error || !data) throw error ?? new Error('No file');
      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      logger.error('Download failed', err as Error);
      toast({ title: 'Download failed', variant: 'destructive' });
    }
  };

  const handleShare = async () => {
    if (!document) return;
    setSharing(true);
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(document.file_path, Number(expiry));
      if (error || !data?.signedUrl) throw error ?? new Error('No URL');
      await navigator.clipboard.writeText(data.signedUrl);
      const label = SHARE_EXPIRY_OPTIONS.find((o) => String(o.seconds) === expiry)?.label ?? '';
      toast({ title: 'Share link copied', description: `Link valid for ${label}.` });
    } catch (err) {
      logger.error('Share link failed', err as Error);
      toast({ title: 'Could not create share link', variant: 'destructive' });
    } finally {
      setSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{document?.name ?? 'Preview'}</DialogTitle>
        </DialogHeader>

        <div className="min-h-[55vh]">
          {loading ? (
            <div className="flex h-[55vh] items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading preview…
            </div>
          ) : !document || !previewUrl ? (
            <div className="flex h-[55vh] flex-col items-center justify-center gap-2 text-muted-foreground">
              <FileText className="h-10 w-10" />
              <p>Preview unavailable.</p>
            </div>
          ) : isPdf(document) ? (
            <iframe title={`Preview of ${document.name}`} src={previewUrl} className="h-[55vh] w-full rounded border" />
          ) : isImage(document) ? (
            <div className="flex h-[55vh] items-center justify-center">
              <img src={previewUrl} alt={document.name} className="max-h-full max-w-full rounded object-contain" />
            </div>
          ) : (
            <div className="flex h-[55vh] flex-col items-center justify-center gap-3 text-muted-foreground">
              <FileText className="h-10 w-10" />
              <p>This file type can't be previewed inline.</p>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="mr-1 h-4 w-4" /> Download to view
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <div className="flex items-center gap-2">
            <Select value={expiry} onValueChange={setExpiry}>
              <SelectTrigger className="w-36" aria-label="Share link expiration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHARE_EXPIRY_OPTIONS.map((o) => (
                  <SelectItem key={o.seconds} value={String(o.seconds)}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleShare} disabled={sharing || !document}>
              <Share2 className="mr-1 h-4 w-4" /> {sharing ? 'Creating…' : 'Share Link'}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDownload} disabled={!document}>
              <Download className="mr-1 h-4 w-4" /> Download
            </Button>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DocumentPreviewModal;
