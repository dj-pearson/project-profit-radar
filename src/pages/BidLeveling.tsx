import { useCallback, useEffect, useMemo, useState } from 'react';
import { GitCompare, Plus, Trash2, Award, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { RoleGuard, ROLE_GROUPS } from '@/components/auth/RoleGuard';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import {
  fetchPackages,
  createPackage,
  deletePackage,
  fetchLevelingData,
  createScopeItem,
  deleteScopeItem,
  createBid,
  deleteBid,
  setLineAmount,
  awardBid,
  type BidPackage,
  type LevelingData,
} from '@/services/bidLevelingService';
import { levelBids } from '@/lib/bid-leveling';

interface ProjectOption {
  id: string;
  name: string;
}
interface VendorOption {
  id: string;
  name: string;
}

const currency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const BidLeveling = () => {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const companyId = userProfile?.company_id;

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState('');
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [packages, setPackages] = useState<BidPackage[]>([]);
  const [packageId, setPackageId] = useState('');
  const [data, setData] = useState<LevelingData>({ scopeItems: [], bids: [], lineItems: [] });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);

  const [pkgDialog, setPkgDialog] = useState(false);
  const [pkgForm, setPkgForm] = useState({ name: '', description: '' });
  const [scopeDialog, setScopeDialog] = useState(false);
  const [scopeForm, setScopeForm] = useState({ description: '', quantity: '1', unit: '', estimate: '' });
  const [bidDialog, setBidDialog] = useState(false);
  const [bidForm, setBidForm] = useState({ vendorName: '', vendorId: '' });

  useEffect(() => {
    if (!companyId) return;
    supabase
      .from('projects')
      .select('id, name')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .then(({ data: rows, error }) => {
        if (error) {
          logger.error('Failed to load projects for bid leveling', error);
          return;
        }
        const list = (rows ?? []) as ProjectOption[];
        setProjects(list);
        setProjectId((cur) => cur || list[0]?.id || '');
      });
    supabase
      .from('vendors')
      .select('id, name')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name', { ascending: true })
      .then(({ data: rows }) => setVendors((rows ?? []) as VendorOption[]));
  }, [companyId]);

  // Load packages when the project changes.
  useEffect(() => {
    if (!companyId || !projectId) return;
    fetchPackages(projectId, companyId)
      .then((pkgs) => {
        setPackages(pkgs);
        setPackageId((cur) => (pkgs.some((p) => p.id === cur) ? cur : pkgs[0]?.id || ''));
      })
      .catch((err) => logger.error('Failed to load bid packages', err as Error));
  }, [companyId, projectId]);

  const loadLeveling = useCallback(async () => {
    if (!companyId || !packageId) {
      setData({ scopeItems: [], bids: [], lineItems: [] });
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      setData(await fetchLevelingData(packageId, companyId));
    } catch (err) {
      logger.error('Failed to load leveling data', err as Error);
      setLoadError(true);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load bids.' });
    } finally {
      setLoading(false);
    }
  }, [companyId, packageId, toast]);

  useEffect(() => {
    loadLeveling();
  }, [loadLeveling]);

  const leveled = useMemo(
    () => levelBids(data.scopeItems, data.bids, data.lineItems),
    [data]
  );
  const amountByCell = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const li of data.lineItems) m.set(`${li.bid_id}:${li.scope_item_id}`, li.amount);
    return m;
  }, [data.lineItems]);

  const reloadPackages = async () => {
    if (!companyId || !projectId) return;
    setPackages(await fetchPackages(projectId, companyId));
  };

  const handleCreatePackage = async () => {
    if (!companyId || !projectId || !pkgForm.name.trim()) {
      toast({ variant: 'destructive', title: 'Name required', description: 'Enter a package name.' });
      return;
    }
    setBusy(true);
    try {
      await createPackage({ companyId, projectId, name: pkgForm.name.trim(), description: pkgForm.description.trim() || null });
      setPkgDialog(false);
      setPkgForm({ name: '', description: '' });
      await reloadPackages();
    } catch (err) {
      logger.error('Failed to create package', err as Error);
      toast({ variant: 'destructive', title: 'Error', description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const handleDeletePackage = async () => {
    if (!companyId || !packageId || !confirm('Delete this bid package and all its bids?')) return;
    try {
      await deletePackage(packageId, companyId);
      setPackageId('');
      await reloadPackages();
    } catch (err) {
      logger.error('Failed to delete package', err as Error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete package.' });
    }
  };

  const handleAddScope = async () => {
    if (!companyId || !packageId || !scopeForm.description.trim()) {
      toast({ variant: 'destructive', title: 'Description required', description: 'Enter a scope item.' });
      return;
    }
    setBusy(true);
    try {
      await createScopeItem({
        companyId,
        packageId,
        description: scopeForm.description.trim(),
        quantity: Number(scopeForm.quantity) || 1,
        unit: scopeForm.unit.trim() || null,
        estimateAmount: Number(scopeForm.estimate) || 0,
        sortOrder: data.scopeItems.length,
      });
      setScopeDialog(false);
      setScopeForm({ description: '', quantity: '1', unit: '', estimate: '' });
      await loadLeveling();
    } catch (err) {
      logger.error('Failed to add scope item', err as Error);
      toast({ variant: 'destructive', title: 'Error', description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const handleAddBid = async () => {
    if (!companyId || !packageId) return;
    const vendor = vendors.find((v) => v.id === bidForm.vendorId);
    const vendorName = vendor?.name || bidForm.vendorName.trim();
    if (!vendorName) {
      toast({ variant: 'destructive', title: 'Vendor required', description: 'Pick or enter a vendor.' });
      return;
    }
    setBusy(true);
    try {
      await createBid({ companyId, packageId, vendorName, vendorId: vendor?.id ?? null });
      setBidDialog(false);
      setBidForm({ vendorName: '', vendorId: '' });
      await loadLeveling();
    } catch (err) {
      logger.error('Failed to add bid', err as Error);
      toast({ variant: 'destructive', title: 'Error', description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const handleAmountBlur = async (bidId: string, scopeItemId: string, raw: string) => {
    if (!companyId) return;
    const trimmed = raw.trim();
    const amount = trimmed === '' ? null : Number(trimmed);
    if (amount != null && Number.isNaN(amount)) return;
    const prev = amountByCell.get(`${bidId}:${scopeItemId}`) ?? null;
    if (prev === amount) return;
    try {
      await setLineAmount({ companyId, bidId, scopeItemId, amount });
      await loadLeveling();
    } catch (err) {
      logger.error('Failed to save bid amount', err as Error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save amount.' });
    }
  };

  const handleDeleteBid = async (bidId: string) => {
    if (!companyId || !confirm('Remove this bid?')) return;
    try {
      await deleteBid(bidId, companyId);
      await loadLeveling();
    } catch (err) {
      logger.error('Failed to delete bid', err as Error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove bid.' });
    }
  };

  const handleDeleteScope = async (id: string) => {
    if (!companyId) return;
    try {
      await deleteScopeItem(id, companyId);
      await loadLeveling();
    } catch (err) {
      logger.error('Failed to delete scope item', err as Error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove scope item.' });
    }
  };

  const handleAward = async (bidId: string, vendorName: string) => {
    if (!companyId || !user?.id || !packageId) return;
    if (!confirm(`Award this package to ${vendorName}?`)) return;
    setBusy(true);
    try {
      await awardBid({ companyId, packageId, bidId, vendorName, userId: user.id });
      toast({ title: 'Awarded', description: `${vendorName} selected as awardee.` });
      await Promise.all([loadLeveling(), reloadPackages()]);
    } catch (err) {
      logger.error('Failed to award bid', err as Error);
      toast({ variant: 'destructive', title: 'Error', description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const currentPackage = packages.find((p) => p.id === packageId) ?? null;

  return (
    <RoleGuard allowedRoles={ROLE_GROUPS.PROJECT_EDITORS}>
      <DashboardLayout title="Bid Leveling">
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold">
                <GitCompare className="h-6 w-6" aria-hidden="true" /> Bid Leveling
              </h1>
              <p className="text-sm text-muted-foreground">
                Compare subcontractor/supplier bids against a shared scope, flag gaps and outliers, see variance vs estimate, and award.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="bl-project">Project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger id="bl-project" className="w-[12rem]"><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="bl-package">Package</Label>
                <Select value={packageId} onValueChange={setPackageId} disabled={packages.length === 0}>
                  <SelectTrigger id="bl-package" className="w-[12rem]"><SelectValue placeholder="No packages" /></SelectTrigger>
                  <SelectContent>
                    {packages.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={() => setPkgDialog(true)} disabled={!projectId}>
                <Plus className="mr-1 h-4 w-4" /> Package
              </Button>
            </div>
          </div>

          {!packageId ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">Create or select a bid package to begin leveling.</CardContent></Card>
          ) : loading ? (
            <Skeleton className="h-80 w-full" />
          ) : loadError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>Couldn't load bids</AlertTitle>
              <AlertDescription className="flex flex-col items-start gap-3">
                <span>Something went wrong while loading this package. Please try again.</span>
                <Button size="sm" variant="outline" onClick={loadLeveling}>Retry</Button>
              </AlertDescription>
            </Alert>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {currentPackage?.name}
                    {currentPackage?.status === 'awarded' && <Badge className="bg-green-500/15 text-green-700">Awarded</Badge>}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setScopeDialog(true)}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Scope item
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setBidDialog(true)} disabled={data.scopeItems.length === 0}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Bid
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleDeletePackage} aria-label="Delete package">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {data.scopeItems.length === 0 ? (
                  <p className="py-6 text-center text-muted-foreground">Add scope items to build the comparison template.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="p-2">Scope item</th>
                          <th className="p-2 text-right">Estimate</th>
                          {data.bids.map((b) => (
                            <th key={b.id} className="p-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {b.is_awarded && <Award className="h-3.5 w-3.5 text-green-600" aria-label="Awarded" />}
                                {b.vendor_name}
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteBid(b.id)} aria-label={`Remove bid ${b.vendor_name}`}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {leveled.rows.map((row) => (
                          <tr key={row.scopeItem.id} className="border-b">
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <span>{row.scopeItem.description}</span>
                                <span className="text-xs text-muted-foreground">
                                  {row.scopeItem.quantity} {row.scopeItem.unit ?? ''}
                                </span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteScope(row.scopeItem.id)} aria-label={`Remove scope item ${row.scopeItem.description}`}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </td>
                            <td className="p-2 text-right text-muted-foreground">{currency(row.scopeItem.estimate_amount)}</td>
                            {row.cells.map((cell) => (
                              <td
                                key={cell.bidId}
                                className={cn(
                                  'p-1 text-right',
                                  cell.isGap && 'bg-red-500/10',
                                  cell.isOutlier && 'bg-yellow-500/10',
                                  cell.isLowest && 'bg-green-500/10'
                                )}
                              >
                                <Input
                                  type="number"
                                  min="0"
                                  defaultValue={cell.amount ?? ''}
                                  onBlur={(e) => handleAmountBlur(cell.bidId, row.scopeItem.id, e.target.value)}
                                  className="h-8 w-24 text-right"
                                  aria-label={`${data.bids.find((b) => b.id === cell.bidId)?.vendor_name} amount for ${row.scopeItem.description}`}
                                  placeholder="—"
                                />
                                {cell.isGap && <div className="text-[10px] text-red-600">gap</div>}
                                {cell.isOutlier && !cell.isGap && <div className="text-[10px] text-yellow-700">outlier</div>}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {/* Totals + variance */}
                        <tr className="border-t-2 font-semibold">
                          <td className="p-2">Total</td>
                          <td className="p-2 text-right">{currency(leveled.estimateTotal)}</td>
                          {leveled.totals.map((t) => (
                            <td key={t.bidId} className="p-2 text-right">
                              <div>{currency(t.total)}</div>
                              <div className={cn('text-xs font-normal', t.variance > 0 ? 'text-red-600' : 'text-green-600')}>
                                {t.variance > 0 ? '+' : ''}{currency(t.variance)} vs est
                              </div>
                              {t.gaps > 0 && <div className="text-[10px] font-normal text-red-600">{t.gaps} gap{t.gaps === 1 ? '' : 's'}</div>}
                            </td>
                          ))}
                        </tr>
                        {/* Award actions */}
                        {data.bids.length > 0 && (
                          <tr>
                            <td className="p-2" colSpan={2}></td>
                            {leveled.totals.map((t) => (
                              <td key={t.bidId} className="p-2 text-right">
                                <Button
                                  size="sm"
                                  variant={t.isAwarded ? 'default' : 'outline'}
                                  onClick={() => handleAward(t.bidId, t.vendorName)}
                                  disabled={busy || t.isAwarded}
                                >
                                  <Award className="mr-1 h-3.5 w-3.5" /> {t.isAwarded ? 'Awarded' : 'Award'}
                                </Button>
                              </td>
                            ))}
                          </tr>
                        )}
                      </tbody>
                    </table>
                    {data.bids.length === 0 && (
                      <p className="py-4 text-center text-muted-foreground">Add bids to compare against the scope.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Create package dialog */}
        <Dialog open={pkgDialog} onOpenChange={setPkgDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Bid Package</DialogTitle>
              <DialogDescription>A scope to collect and compare bids against.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="pkg-name">Name</Label>
                <Input id="pkg-name" value={pkgForm.name} onChange={(e) => setPkgForm((f) => ({ ...f, name: e.target.value }))} placeholder="Electrical rough-in" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pkg-desc">Description</Label>
                <Input id="pkg-desc" value={pkgForm.description} onChange={(e) => setPkgForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPkgDialog(false)} disabled={busy}>Cancel</Button>
              <Button onClick={handleCreatePackage} disabled={busy}>{busy ? 'Creating…' : 'Create'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add scope item dialog */}
        <Dialog open={scopeDialog} onOpenChange={setScopeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Scope Item</DialogTitle>
              <DialogDescription>A line in the shared scope, with the estimate/budget baseline.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="sc-desc">Description</Label>
                <Input id="sc-desc" value={scopeForm.description} onChange={(e) => setScopeForm((f) => ({ ...f, description: e.target.value }))} placeholder="Panel + breakers" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="sc-qty">Qty</Label>
                  <Input id="sc-qty" type="number" min="0" value={scopeForm.quantity} onChange={(e) => setScopeForm((f) => ({ ...f, quantity: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sc-unit">Unit</Label>
                  <Input id="sc-unit" value={scopeForm.unit} onChange={(e) => setScopeForm((f) => ({ ...f, unit: e.target.value }))} placeholder="ea" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sc-est">Estimate $</Label>
                  <Input id="sc-est" type="number" min="0" value={scopeForm.estimate} onChange={(e) => setScopeForm((f) => ({ ...f, estimate: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setScopeDialog(false)} disabled={busy}>Cancel</Button>
              <Button onClick={handleAddScope} disabled={busy}>{busy ? 'Adding…' : 'Add'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add bid dialog */}
        <Dialog open={bidDialog} onOpenChange={setBidDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Bid</DialogTitle>
              <DialogDescription>Pick a vendor or enter a name, then quote amounts in the matrix.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {vendors.length > 0 && (
                <div className="space-y-1">
                  <Label htmlFor="bid-vendor">Vendor</Label>
                  <Select value={bidForm.vendorId} onValueChange={(v) => setBidForm((f) => ({ ...f, vendorId: v }))}>
                    <SelectTrigger id="bid-vendor"><SelectValue placeholder="Select a vendor (optional)" /></SelectTrigger>
                    <SelectContent>
                      {vendors.map((v) => (<SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="bid-name">Or vendor name</Label>
                <Input id="bid-name" value={bidForm.vendorName} onChange={(e) => setBidForm((f) => ({ ...f, vendorName: e.target.value, vendorId: '' }))} placeholder="ABC Electric" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBidDialog(false)} disabled={busy}>Cancel</Button>
              <Button onClick={handleAddBid} disabled={busy}>{busy ? 'Adding…' : 'Add Bid'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </RoleGuard>
  );
};

export default BidLeveling;
