import { useEffect, useState, useCallback } from 'react';
import { FileText, Upload, Trash2, Pencil, Copy, Plus } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface Template {
  id: string;
  name: string;
  description: string | null;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
}

const TEMPLATE_BUCKET = 'company-documents';

export default function DocumentTemplates() {
  const { user, userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);

  // Upload dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');

  // Edit dialog
  const [editing, setEditing] = useState<Template | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Clone dialog
  const [cloning, setCloning] = useState<Template | null>(null);
  const [cloneProjectId, setCloneProjectId] = useState('');

  const loadTemplates = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id, name, description, file_path, file_type, file_size, document_type, company_id')
        .eq('company_id', companyId)
        .eq('document_type', 'template')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTemplates((data as unknown as Template[]) ?? []);
    } catch (err) {
      logger.error('Failed to load templates', err as Error);
      toast({ title: 'Could not load templates', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (!companyId) return;
    supabase
      .from('projects')
      .select('id, name')
      .eq('company_id', companyId)
      .order('name')
      .then(({ data }) => setProjects(data ?? []));
  }, [companyId]);

  const handleUpload = async () => {
    if (!file || !companyId) {
      toast({ title: 'Choose a file first', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${companyId}/templates/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(TEMPLATE_BUCKET).upload(path, file);
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from('documents').insert([
        {
          name: uploadName.trim() || file.name,
          description: uploadDesc || null,
          file_path: path,
          file_type: file.type || 'application/octet-stream',
          file_size: file.size,
          company_id: companyId,
          uploaded_by: user?.id,
          document_type: 'template',
          is_current_version: true,
        },
      ]);
      if (insErr) throw insErr;
      toast({ title: 'Template uploaded' });
      setUploadOpen(false);
      setFile(null);
      setUploadName('');
      setUploadDesc('');
      await loadTemplates();
    } catch (err) {
      logger.error('Template upload failed', err as Error);
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('documents')
        .update({ name: editName.trim() || editing.name, description: editDesc || null })
        .eq('id', editing.id);
      if (error) throw error;
      toast({ title: 'Template updated' });
      setEditing(null);
      await loadTemplates();
    } catch (err) {
      logger.error('Template edit failed', err as Error);
      toast({ title: 'Could not update template', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (t: Template) => {
    setBusy(true);
    try {
      await supabase.storage.from(TEMPLATE_BUCKET).remove([t.file_path]);
      const { error } = await supabase.from('documents').delete().eq('id', t.id);
      if (error) throw error;
      toast({ title: 'Template deleted' });
      await loadTemplates();
    } catch (err) {
      logger.error('Template delete failed', err as Error);
      toast({ title: 'Could not delete template', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleClone = async () => {
    if (!cloning || !cloneProjectId || !companyId) {
      toast({ title: 'Select a project', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      // Copy the underlying file into the project documents bucket.
      const { data: blob, error: dlErr } = await supabase.storage
        .from(TEMPLATE_BUCKET)
        .download(cloning.file_path);
      if (dlErr || !blob) throw dlErr ?? new Error('Download failed');

      const ext = cloning.file_path.split('.').pop();
      const newPath = `${cloneProjectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('project-documents').upload(newPath, blob);
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from('documents').insert([
        {
          name: `Copy of ${cloning.name}`,
          description: cloning.description,
          file_path: newPath,
          file_type: cloning.file_type,
          file_size: cloning.file_size,
          company_id: companyId,
          project_id: cloneProjectId,
          uploaded_by: user?.id,
          document_type: 'general',
          is_current_version: true,
        },
      ]);
      if (insErr) throw insErr;
      toast({ title: 'Template cloned', description: 'A copy was added to the project documents.' });
      setCloning(null);
      setCloneProjectId('');
    } catch (err) {
      logger.error('Template clone failed', err as Error);
      toast({ title: 'Could not clone template', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccessiblePageWrapper pageTitle="Document Templates">
      <DashboardLayout title="Document Templates" hasAccessibleWrapper>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Reusable document templates (contracts, scope of work, RFIs) — clone them into any project.
            </p>
            <Button onClick={() => setUploadOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> New Template
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
                <FileText className="h-10 w-10" />
                <p>No templates yet. Upload a reusable document to get started.</p>
                <Button variant="outline" onClick={() => setUploadOpen(true)}>
                  <Upload className="mr-1 h-4 w-4" /> Upload template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => (
                <Card key={t.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate">{t.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
                      {t.description || 'No description'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => setCloning(t)} disabled={busy}>
                        <Copy className="mr-1 h-3.5 w-3.5" /> Clone
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(t);
                          setEditName(t.name);
                          setEditDesc(t.description ?? '');
                        }}
                        disabled={busy}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(t)} disabled={busy}>
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Upload */}
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="tpl-file">File</Label>
                <Input
                  id="tpl-file"
                  type="file"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setFile(f);
                    if (f && !uploadName) setUploadName(f.name);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="tpl-name">Name</Label>
                <Input id="tpl-name" value={uploadName} onChange={(e) => setUploadName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="tpl-desc">Description</Label>
                <Textarea id="tpl-desc" value={uploadDesc} onChange={(e) => setUploadDesc(e.target.value)} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={busy || !file}>
                {busy ? 'Uploading…' : 'Upload'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit */}
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="tpl-edit-name">Name</Label>
                <Input id="tpl-edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="tpl-edit-desc">Description</Label>
                <Textarea id="tpl-edit-desc" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={busy}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Clone */}
        <Dialog open={!!cloning} onOpenChange={(o) => !o && setCloning(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clone “{cloning?.name}” to a project</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="tpl-clone-project">Project</Label>
                <Select value={cloneProjectId} onValueChange={setCloneProjectId}>
                  <SelectTrigger id="tpl-clone-project">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCloning(null)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={handleClone} disabled={busy || !cloneProjectId}>
                {busy ? 'Cloning…' : 'Clone to project'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </AccessiblePageWrapper>
  );
}
