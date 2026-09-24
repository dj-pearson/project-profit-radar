import { useState } from 'react';
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
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { ErrorState } from '@/components/ui/states';
import { useDocumentTemplates, type DocumentTemplate } from '@/hooks/useDocumentTemplates';
import { confirmAction } from "@/components/ui/confirm-dialog";

type Template = DocumentTemplate;

export default function DocumentTemplates() {
  const data = useDocumentTemplates();
  const companyId = data.companyId;
  const templates = data.templates.data ?? [];
  const loading = data.templates.isLoading;
  const projects = data.projects.data ?? [];
  const busy = data.upload.isPending || data.update.isPending || data.remove.isPending || data.clone.isPending;
  const errorText = (err: unknown) => (err instanceof Error ? err.message : undefined);

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

  const handleUpload = async () => {
    if (!file || !companyId) {
      toast({ title: 'Choose a file first', variant: 'destructive' });
      return;
    }
    try {
      await data.upload.mutateAsync({ file, name: uploadName, description: uploadDesc });
      toast({ title: 'Template uploaded' });
      setUploadOpen(false);
      setFile(null);
      setUploadName('');
      setUploadDesc('');
    } catch (err) {
      logger.error('Template upload failed', err as Error);
      toast({ title: 'Upload failed', description: errorText(err), variant: 'destructive' });
    }
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    try {
      await data.update.mutateAsync({
        id: editing.id,
        patch: { name: editName.trim() || editing.name, description: editDesc || null },
      });
      toast({ title: 'Template updated' });
      setEditing(null);
    } catch (err) {
      logger.error('Template edit failed', err as Error);
      toast({ title: 'Could not update template', description: errorText(err), variant: 'destructive' });
    }
  };

  const handleDelete = async (t: Template) => {
    if (!(await confirmAction({ title: `Delete template "${t.name}"?`, description: 'The file is removed from storage. This cannot be undone.', destructive: true }))) return;
    try {
      await data.remove.mutateAsync(t);
      toast({ title: 'Template deleted' });
    } catch (err) {
      logger.error('Template delete failed', err as Error);
      toast({ title: 'Could not delete template', description: errorText(err), variant: 'destructive' });
    }
  };

  const handleClone = async () => {
    if (!cloning || !cloneProjectId || !companyId) {
      toast({ title: 'Select a project', variant: 'destructive' });
      return;
    }
    try {
      await data.clone.mutateAsync({ template: cloning, projectId: cloneProjectId });
      toast({ title: 'Template cloned', description: 'A copy was added to the project documents.' });
      setCloning(null);
      setCloneProjectId('');
    } catch (err) {
      logger.error('Template clone failed', err as Error);
      toast({ title: 'Could not clone template', description: errorText(err), variant: 'destructive' });
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
          ) : data.templates.error ? (
            <ErrorState
              error={errorText(data.templates.error) ?? 'Could not load templates'}
              onRetry={() => { void data.templates.refetch(); }}
            />
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
                {data.projects.error && (
                  <p role="alert" className="text-sm text-destructive">
                    Projects could not be loaded: {errorText(data.projects.error)}
                  </p>
                )}
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
