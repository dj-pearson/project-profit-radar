import { useCallback, useEffect, useState } from 'react';
import { HelpCircle, Paperclip, Send } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface RFI {
  id: string;
  rfi_number: string;
  subject: string;
  description: string | null;
  status: string | null;
  created_at: string;
  response_date: string | null;
  responseText?: string | null;
}

interface ClientPortalRFIsProps {
  projectId: string;
  companyId: string;
  userId?: string;
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  submitted: 'outline',
  in_review: 'secondary',
  answered: 'default',
};

const statusLabel = (s: string | null) => {
  switch (s) {
    case 'answered':
      return 'Answered';
    case 'in_review':
      return 'In review';
    default:
      return 'Submitted';
  }
};

/**
 * US-083: Client portal RFI submission + list.
 *
 * Clients submit RFIs (subject, description, optional file attachment) against a
 * project and track their status (submitted / in review / answered). Attachments
 * are stored in the project-documents bucket and registered in `documents` so the
 * contractor can find them. Contractors respond from the project detail RFIs page.
 */
export function ClientPortalRFIs({ projectId, companyId, userId }: ClientPortalRFIsProps) {
  const [rfis, setRfis] = useState<RFI[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const loadRfis = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rfis')
        .select('id, rfi_number, subject, description, status, created_at, response_date')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const list = (data as unknown as RFI[]) ?? [];

      // Attach the latest answer (responses live in rfi_responses).
      const ids = list.map((r) => r.id);
      if (ids.length) {
        const { data: responses } = await supabase
          .from('rfi_responses')
          .select('rfi_id, response_text, response_date')
          .in('rfi_id', ids)
          .order('response_date', { ascending: false });
        const latest = new Map<string, string>();
        for (const resp of responses ?? []) {
          if (!latest.has(resp.rfi_id)) latest.set(resp.rfi_id, resp.response_text);
        }
        list.forEach((r) => {
          r.responseText = latest.get(r.id) ?? null;
        });

        // Notify the client about newly-answered RFIs they haven't seen yet.
        try {
          const key = `brikly-rfi-seen-answered:${projectId}`;
          const seen = new Set<string>(JSON.parse(localStorage.getItem(key) ?? '[]'));
          const answered = list.filter((r) => r.responseText || r.status === 'answered');
          const fresh = answered.filter((r) => !seen.has(r.id));
          if (fresh.length > 0) {
            toast({
              title: `${fresh.length} RFI${fresh.length > 1 ? 's' : ''} answered`,
              description: 'Your contractor has responded — see the RFIs list below.',
            });
            answered.forEach((r) => seen.add(r.id));
            localStorage.setItem(key, JSON.stringify(Array.from(seen)));
          }
        } catch {
          /* localStorage unavailable — skip notification */
        }
      }
      setRfis(list);
    } catch (err) {
      logger.error('Failed to load RFIs', err as Error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadRfis();
  }, [loadRfis]);

  const handleSubmit = async () => {
    if (!subject.trim()) {
      toast({ title: 'Subject is required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const rfiNumber = `RFI-${Date.now().toString().slice(-6)}`;

      // Optional attachment → project-documents bucket + documents registry.
      if (file) {
        const ext = file.name.split('.').pop();
        const path = `${projectId}/rfi/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('project-documents').upload(path, file);
        if (upErr) throw upErr;
        await supabase.from('documents').insert([
          {
            name: file.name,
            description: `Attachment for ${rfiNumber}`,
            file_path: path,
            file_type: file.type || 'application/octet-stream',
            file_size: file.size,
            company_id: companyId,
            project_id: projectId,
            uploaded_by: userId,
            document_type: 'rfi-attachment',
            is_current_version: true,
          },
        ]);
      }

      const { error } = await supabase.from('rfis').insert([
        {
          rfi_number: rfiNumber,
          subject: subject.trim(),
          description: description.trim() || null,
          project_id: projectId,
          company_id: companyId,
          created_by: userId,
          status: 'submitted',
          priority: 'medium',
        },
      ]);
      if (error) throw error;

      toast({ title: 'RFI submitted', description: `${rfiNumber} sent to your contractor.` });
      setSubject('');
      setDescription('');
      setFile(null);
      await loadRfis();
    } catch (err) {
      logger.error('RFI submission failed', err as Error);
      toast({ title: 'Could not submit RFI', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" /> Submit a Request for Information
          </CardTitle>
          <CardDescription>Ask your contractor a question about the project.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="rfi-subject">Subject *</Label>
            <Input id="rfi-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Tile color confirmation" />
          </div>
          <div>
            <Label htmlFor="rfi-desc">Details</Label>
            <Textarea id="rfi-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div>
            <Label htmlFor="rfi-file" className="flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5" /> Attachment (optional)
            </Label>
            <Input id="rfi-file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <Button onClick={handleSubmit} disabled={submitting}>
            <Send className="mr-1 h-4 w-4" /> {submitting ? 'Submitting…' : 'Submit RFI'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your RFIs</CardTitle>
          <CardDescription>Questions you've submitted and their status</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : rfis.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">No RFIs submitted yet.</p>
          ) : (
            <div className="space-y-3">
              {rfis.map((r) => (
                <div key={r.id} className="rounded-lg border p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-medium">
                      <span className="text-muted-foreground">{r.rfi_number}</span> · {r.subject}
                    </span>
                    <Badge variant={STATUS_VARIANT[r.status ?? 'submitted'] ?? 'outline'}>
                      {statusLabel(r.status)}
                    </Badge>
                  </div>
                  {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                  {r.responseText && (
                    <div className="mt-2 rounded bg-muted p-2 text-sm">
                      <p className="font-medium">Response</p>
                      <p className="text-muted-foreground">{r.responseText}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ClientPortalRFIs;
