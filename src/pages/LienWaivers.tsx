import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileSignature, ShieldCheck, ShieldAlert, Trash2, PenLine, Send, CheckCircle2, History } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { RoleGuard, ROLE_GROUPS } from '@/components/auth/RoleGuard';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { SignatureCapture } from '@/components/ui/signature-capture';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import {
  WAIVER_TYPES,
  waiverTypeLabel,
  waiverStatusMeta,
  resolvePaymentHold,
  validateWaiverRequest,
  type WaiverType,
} from '@/lib/lien-waivers';
import {
  fetchWaivers,
  createWaiver,
  advanceWaiver,
  deleteWaiver,
  fetchWaiverEvents,
  type LienWaiver,
  type LienWaiverEvent,
} from '@/services/lienWaiverService';

interface NamedRow {
  id: string;
  name: string;
}

const blankForm = {
  contractorId: '',
  projectId: '',
  type: '' as WaiverType | '',
  amount: '',
  throughDate: '',
  holdsPayment: true,
  notes: '',
};

const currency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const LienWaivers = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const companyId = userProfile?.company_id;

  const [contractors, setContractors] = useState<NamedRow[]>([]);
  const [projects, setProjects] = useState<NamedRow[]>([]);
  const [waivers, setWaivers] = useState<LienWaiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);

  const [signTarget, setSignTarget] = useState<LienWaiver | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [signedBy, setSignedBy] = useState('');

  const [auditTarget, setAuditTarget] = useState<LienWaiver | null>(null);
  const [auditEvents, setAuditEvents] = useState<LienWaiverEvent[]>([]);

  const contractorName = useCallback(
    (id: string) => contractors.find((c) => c.id === id)?.name ?? id,
    [contractors]
  );
  const projectName = useCallback(
    (id: string) => projects.find((p) => p.id === id)?.name ?? id,
    [projects]
  );

  const refresh = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const [c, p, w] = await Promise.all([
        supabase.from('contractors').select('id, business_name').eq('company_id', companyId).order('business_name'),
        supabase.from('projects').select('id, name').eq('company_id', companyId).order('created_at', { ascending: false }),
        fetchWaivers(companyId),
      ]);
      if (c.error) throw new Error(c.error.message);
      if (p.error) throw new Error(p.error.message);
      setContractors((c.data ?? []).map((r) => ({ id: r.id, name: r.business_name ?? 'Unnamed' })));
      setProjects((p.data ?? []).map((r) => ({ id: r.id, name: r.name ?? 'Untitled' })));
      setWaivers(w);
    } catch (err) {
      logger.error('Failed to load lien waivers', err as Error);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Payment-hold summary grouped by contractor over their payment-gating waivers. */
  const holdSummary = useMemo(() => {
    const byContractor = new Map<string, string[]>();
    for (const w of waivers) {
      if (!w.holds_payment) continue;
      const arr = byContractor.get(w.contractor_id) ?? [];
      arr.push(w.status);
      byContractor.set(w.contractor_id, arr);
    }
    return Array.from(byContractor.entries()).map(([contractorId, statuses]) => ({
      contractorId,
      hold: resolvePaymentHold(statuses),
    }));
  }, [waivers]);

  const handleCreate = async () => {
    if (!companyId) return;
    const errors = validateWaiverRequest(form);
    if (errors.length) {
      toast({ variant: 'destructive', title: 'Please fix the following', description: errors.join(' ') });
      return;
    }
    setSaving(true);
    try {
      await createWaiver({
        companyId,
        projectId: form.projectId,
        contractorId: form.contractorId,
        waiverType: form.type as WaiverType,
        amount: Number(form.amount),
        throughDate: form.throughDate,
        holdsPayment: form.holdsPayment,
        notes: form.notes || undefined,
      });
      toast({ title: 'Waiver requested', description: 'The lien waiver request has been created.' });
      setForm(blankForm);
      await refresh();
    } catch (err) {
      logger.error('Failed to create lien waiver', err as Error);
      toast({ variant: 'destructive', title: 'Error', description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const advance = async (waiver: LienWaiver, to: 'sent' | 'received', note?: string) => {
    if (!companyId) return;
    try {
      await advanceWaiver({ companyId, waiver, to, note });
      await refresh();
    } catch (err) {
      logger.error('Failed to advance lien waiver', err as Error);
      toast({ variant: 'destructive', title: 'Error', description: (err as Error).message });
    }
  };

  const handleSign = async () => {
    if (!companyId || !signTarget) return;
    if (!signature) {
      toast({ variant: 'destructive', title: 'Signature required', description: 'Please capture a signature before saving.' });
      return;
    }
    try {
      await advanceWaiver({ companyId, waiver: signTarget, to: 'signed', signature, signedBy: signedBy || null, note: 'Waiver signed.' });
      setSignTarget(null);
      setSignature(null);
      setSignedBy('');
      await refresh();
    } catch (err) {
      logger.error('Failed to sign lien waiver', err as Error);
      toast({ variant: 'destructive', title: 'Error', description: (err as Error).message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!companyId || !confirm('Delete this lien waiver and its history?')) return;
    try {
      await deleteWaiver(id, companyId);
      await refresh();
    } catch (err) {
      logger.error('Failed to delete lien waiver', err as Error);
      toast({ variant: 'destructive', title: 'Error', description: (err as Error).message });
    }
  };

  const openAudit = async (waiver: LienWaiver) => {
    if (!companyId) return;
    setAuditTarget(waiver);
    try {
      setAuditEvents(await fetchWaiverEvents(waiver.id, companyId));
    } catch (err) {
      logger.error('Failed to load waiver audit trail', err as Error);
      setAuditEvents([]);
    }
  };

  return (
    <RoleGuard allowedRoles={ROLE_GROUPS.PROJECT_EDITORS}>
      <DashboardLayout title="Lien Waivers">
        <div className="space-y-6">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <FileSignature className="h-6 w-6" aria-hidden="true" /> Lien Waivers
            </h1>
            <p className="text-sm text-muted-foreground">
              Request, track, and e-sign conditional/unconditional lien waivers — and hold subcontractor
              payments until the required waiver is received.
            </p>
          </div>

          {/* Payment-hold summary */}
          {holdSummary.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Payment hold status</CardTitle>
                <CardDescription>Subcontractor payments gated on waiver receipt.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {holdSummary.map(({ contractorId, hold }) => (
                  <div key={contractorId} className="flex items-start gap-2 rounded-md border p-2 text-sm">
                    {hold.released ? (
                      <ShieldCheck className="mt-0.5 h-4 w-4 text-green-600" aria-hidden="true" />
                    ) : (
                      <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-600" aria-hidden="true" />
                    )}
                    <div>
                      <div className="font-medium">{contractorName(contractorId)}</div>
                      <div className="text-muted-foreground">{hold.reason}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Request form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Request a lien waiver</CardTitle>
              <CardDescription>Issue a waiver request to a subcontractor or supplier.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="lw-contractor">Subcontractor / supplier</Label>
                  <Select value={form.contractorId} onValueChange={(v) => setForm((f) => ({ ...f, contractorId: v }))}>
                    <SelectTrigger id="lw-contractor"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {contractors.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lw-project">Project</Label>
                  <Select value={form.projectId} onValueChange={(v) => setForm((f) => ({ ...f, projectId: v }))}>
                    <SelectTrigger id="lw-project"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lw-type">Waiver type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as WaiverType }))}>
                    <SelectTrigger id="lw-type"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {WAIVER_TYPES.map((t) => (<SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lw-amount">Payment amount</Label>
                  <Input id="lw-amount" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lw-through">Through date</Label>
                  <Input id="lw-through" type="date" value={form.throughDate} onChange={(e) => setForm((f) => ({ ...f, throughDate: e.target.value }))} />
                </div>
                <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                  <Label htmlFor="lw-notes">Notes (optional)</Label>
                  <Textarea id="lw-notes" rows={1} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="lw-holds" checked={form.holdsPayment} onCheckedChange={(v) => setForm((f) => ({ ...f, holdsPayment: v === true }))} />
                <Label htmlFor="lw-holds" className="font-normal">Hold subcontractor payment until this waiver is received</Label>
              </div>
              <Button onClick={handleCreate} disabled={saving}>
                <FileSignature className="mr-1 h-4 w-4" /> {saving ? 'Requesting…' : 'Request waiver'}
              </Button>
            </CardContent>
          </Card>

          {/* Waiver list */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Waivers</CardTitle>
              <CardDescription>Track each waiver from request through receipt.</CardDescription>
            </CardHeader>
            <CardContent>
              {error ? (
                <p className="py-6 text-center text-destructive">{error}</p>
              ) : loading ? (
                <p className="py-6 text-center text-muted-foreground">Loading…</p>
              ) : waivers.length === 0 ? (
                <p className="py-6 text-center text-muted-foreground">No lien waivers yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subcontractor</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Through</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Hold</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {waivers.map((w) => {
                        const meta = waiverStatusMeta(w.status);
                        return (
                          <TableRow key={w.id}>
                            <TableCell>{contractorName(w.contractor_id)}</TableCell>
                            <TableCell>{projectName(w.project_id)}</TableCell>
                            <TableCell className="text-xs">{waiverTypeLabel(w.waiver_type)}</TableCell>
                            <TableCell className="text-right">{currency(w.amount)}</TableCell>
                            <TableCell>{w.through_date}</TableCell>
                            <TableCell><Badge variant={meta.tone}>{meta.label}</Badge></TableCell>
                            <TableCell>
                              {w.holds_payment ? (
                                w.status === 'received'
                                  ? <Badge variant="outline">Released</Badge>
                                  : <Badge variant="secondary">Held</Badge>
                              ) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {(w.status === 'requested') && (
                                  <Button size="icon" variant="ghost" aria-label="Mark sent for signature" onClick={() => advance(w, 'sent', 'Sent for signature.')}>
                                    <Send className="h-4 w-4" />
                                  </Button>
                                )}
                                {(w.status === 'sent') && (
                                  <Button size="icon" variant="ghost" aria-label="Capture signature" onClick={() => { setSignTarget(w); setSignature(w.signature ?? null); setSignedBy(w.signed_by ?? ''); }}>
                                    <PenLine className="h-4 w-4" />
                                  </Button>
                                )}
                                {(w.status === 'signed') && (
                                  <Button size="icon" variant="ghost" aria-label="Mark received" onClick={() => advance(w, 'received', 'Waiver received.')}>
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  </Button>
                                )}
                                <Button size="icon" variant="ghost" aria-label="View audit trail" onClick={() => openAudit(w)}>
                                  <History className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" aria-label="Delete waiver" onClick={() => handleDelete(w.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Signature dialog */}
        <Dialog open={!!signTarget} onOpenChange={(o) => { if (!o) { setSignTarget(null); setSignature(null); setSignedBy(''); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sign lien waiver</DialogTitle>
              <DialogDescription>
                {signTarget ? `${waiverTypeLabel(signTarget.waiver_type)} · ${currency(signTarget.amount)}` : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="lw-signedby">Signed by</Label>
                <Input id="lw-signedby" value={signedBy} onChange={(e) => setSignedBy(e.target.value)} placeholder="Full name" />
              </div>
              <SignatureCapture value={signature} onChange={setSignature} label="Waiver signature" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setSignTarget(null); setSignature(null); setSignedBy(''); }}>Cancel</Button>
              <Button onClick={handleSign}><PenLine className="mr-1 h-4 w-4" /> Save signature</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Audit trail dialog */}
        <Dialog open={!!auditTarget} onOpenChange={(o) => { if (!o) { setAuditTarget(null); setAuditEvents([]); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Waiver audit trail</DialogTitle>
              <DialogDescription>
                {auditTarget ? `${contractorName(auditTarget.contractor_id)} · ${waiverTypeLabel(auditTarget.waiver_type)}` : ''}
              </DialogDescription>
            </DialogHeader>
            {auditEvents.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">No history recorded.</p>
            ) : (
              <ol className="space-y-2">
                {auditEvents.map((e) => (
                  <li key={e.id} className="rounded-md border p-2 text-sm">
                    <div className="font-medium">
                      {e.from_status ? `${waiverStatusMeta(e.from_status).label} → ` : ''}{waiverStatusMeta(e.to_status).label}
                    </div>
                    {e.note && <div className="text-muted-foreground">{e.note}</div>}
                    <div className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</div>
                  </li>
                ))}
              </ol>
            )}
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </RoleGuard>
  );
};

export default LienWaivers;
