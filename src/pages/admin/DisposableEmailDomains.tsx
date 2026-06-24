import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { RoleGuard, ROLE_GROUPS } from '@/components/auth/RoleGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  ShieldOff,
  Search,
  Plus,
  Trash2,
  Power,
  PowerOff,
  MailX,
} from 'lucide-react';

interface DisposableEmailDomain {
  id: string;
  domain: string;
  is_active: boolean;
  source: 'seed' | 'manual' | 'import';
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

type StatusFilter = 'all' | 'active' | 'inactive';
type SourceFilter = 'all' | 'seed' | 'manual' | 'import';

const PAGE_SIZE = 50;

const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;

const DisposableEmailDomains: React.FC = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();

  const [domains, setDomains] = useState<DisposableEmailDomain[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [page, setPage] = useState(1);

  // Add dialog state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkDomains, setBulkDomains] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation state
  const [pendingDelete, setPendingDelete] = useState<DisposableEmailDomain | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (!loading && userProfile && userProfile.role !== 'root_admin') {
      navigate('/dashboard');
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'Only root administrators can manage the disposable email blocklist.',
      });
      return;
    }

    if (userProfile?.role === 'root_admin') {
      loadDomains();
    }
  }, [user, userProfile, loading, navigate]);

  const loadDomains = async () => {
    try {
      setLoadingData(true);
      const { data, error } = await (supabase as any)
        .from('disposable_email_domains')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDomains((data || []) as DisposableEmailDomain[]);
    } catch (error: any) {
      console.error('Error loading disposable email domains:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load disposable email domains.',
      });
    } finally {
      setLoadingData(false);
    }
  };

  const filteredDomains = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return domains.filter((d) => {
      if (term && !d.domain.includes(term)) return false;
      if (statusFilter === 'active' && !d.is_active) return false;
      if (statusFilter === 'inactive' && d.is_active) return false;
      if (sourceFilter !== 'all' && d.source !== sourceFilter) return false;
      return true;
    });
  }, [domains, searchTerm, statusFilter, sourceFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredDomains.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedDomains = filteredDomains.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, sourceFilter]);

  const counts = useMemo(() => {
    const total = domains.length;
    const active = domains.filter((d) => d.is_active).length;
    const manual = domains.filter((d) => d.source === 'manual').length;
    return { total, active, inactive: total - active, manual };
  }, [domains]);

  const normalizeDomain = (raw: string): string => {
    let value = raw.trim().toLowerCase();
    // Strip common prefixes users might paste
    value = value.replace(/^https?:\/\//, '');
    value = value.replace(/^www\./, '');
    // Strip path / query
    value = value.split('/')[0];
    // Strip port
    value = value.split(':')[0];
    // If user pasted an email, take the domain portion
    if (value.includes('@')) {
      value = value.split('@').pop() || '';
    }
    return value;
  };

  const isValidDomain = (value: string): boolean => DOMAIN_REGEX.test(value);

  const resetAddDialog = () => {
    setNewDomain('');
    setNewNotes('');
    setBulkMode(false);
    setBulkDomains('');
  };

  const handleAddDomain = async () => {
    if (!userProfile) return;

    if (bulkMode) {
      const rawEntries = bulkDomains
        .split(/[\s,;\n]+/)
        .map(normalizeDomain)
        .filter(Boolean);

      const unique = Array.from(new Set(rawEntries));
      const invalid = unique.filter((d) => !isValidDomain(d));
      const valid = unique.filter((d) => isValidDomain(d));

      if (valid.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No Valid Domains',
          description: 'Please provide at least one valid domain.',
        });
        return;
      }

      setSubmitting(true);
      try {
        const rows = valid.map((domain) => ({
          domain,
          source: 'manual' as const,
          is_active: true,
          created_by: userProfile.id,
        }));

        const { error } = await (supabase as any)
          .from('disposable_email_domains')
          .upsert(rows, { onConflict: 'domain', ignoreDuplicates: true });

        if (error) throw error;

        toast({
          title: 'Domains Added',
          description:
            invalid.length > 0
              ? `Added ${valid.length} domain(s). Skipped ${invalid.length} invalid entr${invalid.length === 1 ? 'y' : 'ies'}.`
              : `Added ${valid.length} domain(s) to the blocklist.`,
        });

        await loadDomains();
        setIsAddOpen(false);
        resetAddDialog();
      } catch (error: any) {
        console.error('Error adding domains:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'Failed to add domains.',
        });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const domain = normalizeDomain(newDomain);
    if (!isValidDomain(domain)) {
      toast({
        variant: 'destructive',
        title: 'Invalid Domain',
        description: 'Please enter a valid domain name (e.g. mailinator.com).',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from('disposable_email_domains')
        .insert({
          domain,
          notes: newNotes.trim() || null,
          source: 'manual',
          is_active: true,
          created_by: userProfile.id,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            variant: 'destructive',
            title: 'Already Blocked',
            description: `${domain} is already on the blocklist.`,
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: 'Domain Added',
        description: `${domain} is now on the blocklist.`,
      });

      await loadDomains();
      setIsAddOpen(false);
      resetAddDialog();
    } catch (error: any) {
      console.error('Error adding domain:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to add domain.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (row: DisposableEmailDomain) => {
    try {
      const { error } = await (supabase as any)
        .from('disposable_email_domains')
        .update({ is_active: !row.is_active })
        .eq('id', row.id);

      if (error) throw error;

      setDomains((prev) =>
        prev.map((d) => (d.id === row.id ? { ...d, is_active: !row.is_active } : d))
      );

      toast({
        title: row.is_active ? 'Domain Disabled' : 'Domain Enabled',
        description: `${row.domain} is now ${row.is_active ? 'inactive' : 'active'}.`,
      });
    } catch (error: any) {
      console.error('Error toggling domain:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update domain.',
      });
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      const { error } = await (supabase as any)
        .from('disposable_email_domains')
        .delete()
        .eq('id', pendingDelete.id);

      if (error) throw error;

      setDomains((prev) => prev.filter((d) => d.id !== pendingDelete.id));
      toast({
        title: 'Domain Removed',
        description: `${pendingDelete.domain} was removed from the blocklist.`,
      });
    } catch (error: any) {
      console.error('Error deleting domain:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete domain.',
      });
    } finally {
      setPendingDelete(null);
    }
  };

  const getSourceBadge = (source: DisposableEmailDomain['source']) => {
    switch (source) {
      case 'seed':
        return <Badge variant="outline">Seed</Badge>;
      case 'manual':
        return <Badge className="bg-blue-500">Manual</Badge>;
      case 'import':
        return <Badge className="bg-purple-500">Import</Badge>;
      default:
        return <Badge variant="outline">{source}</Badge>;
    }
  };

  if (loading || loadingData) {
    return (
      <DashboardLayout title="Disposable Email Blocklist" showTrialBanner={false}>
        <div
          className="space-y-6"
          role="status"
          aria-live="polite"
          aria-label="Loading disposable email blocklist"
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
          <div className="h-[400px] bg-muted animate-pulse rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <RoleGuard allowedRoles={ROLE_GROUPS.ROOT_ADMIN}>
      <DashboardLayout title="Disposable Email Blocklist" showTrialBanner={false}>
        <div className="space-y-6">
          {/* Stats */}
          <section aria-label="Blocklist summary" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Domains</CardDescription>
                <CardTitle className="text-3xl">{counts.total.toLocaleString()}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active</CardDescription>
                <CardTitle className="text-3xl text-emerald-600">
                  {counts.active.toLocaleString()}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Inactive</CardDescription>
                <CardTitle className="text-3xl text-muted-foreground">
                  {counts.inactive.toLocaleString()}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Manually Added</CardDescription>
                <CardTitle className="text-3xl">{counts.manual.toLocaleString()}</CardTitle>
              </CardHeader>
            </Card>
          </section>

          {/* Toolbar */}
          <section
            className="flex flex-col sm:flex-row gap-4"
            aria-label="Blocklist filters and actions"
          >
            <div className="flex-1" role="search" aria-label="Search domains">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4"
                  aria-hidden="true"
                />
                <Input
                  placeholder="Search by domain..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  aria-label="Search domains"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as SourceFilter)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="seed">Seed</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="import">Import</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              Add Domain
            </Button>
          </section>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Blocked Domains ({filteredDomains.length.toLocaleString()})
              </CardTitle>
              <CardDescription>
                Users signing up with emails from active domains will be blocked at both the
                client and the edge function level.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pagedDomains.length === 0 ? (
                <div className="text-center py-12">
                  <MailX
                    className="h-12 w-12 text-muted-foreground mx-auto mb-4"
                    aria-hidden="true"
                  />
                  <h3 className="text-lg font-medium mb-2">No Domains Found</h3>
                  <p className="text-muted-foreground">
                    No blocklist entries match your current filters.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" aria-label="Blocked email domains">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-3 pr-4 font-medium">Domain</th>
                        <th className="py-3 pr-4 font-medium">Status</th>
                        <th className="py-3 pr-4 font-medium">Source</th>
                        <th className="py-3 pr-4 font-medium">Added</th>
                        <th className="py-3 pr-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedDomains.map((row) => (
                        <tr key={row.id} className="border-b hover:bg-muted/30">
                          <td className="py-3 pr-4 font-mono">{row.domain}</td>
                          <td className="py-3 pr-4">
                            {row.is_active ? (
                              <Badge className="bg-emerald-500">Active</Badge>
                            ) : (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                          </td>
                          <td className="py-3 pr-4">{getSourceBadge(row.source)}</td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {new Date(row.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleActive(row)}
                                aria-label={
                                  row.is_active
                                    ? `Disable ${row.domain}`
                                    : `Enable ${row.domain}`
                                }
                              >
                                {row.is_active ? (
                                  <>
                                    <PowerOff className="h-3 w-3 mr-1" aria-hidden="true" />
                                    Disable
                                  </>
                                ) : (
                                  <>
                                    <Power className="h-3 w-3 mr-1" aria-hidden="true" />
                                    Enable
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setPendingDelete(row)}
                                aria-label={`Delete ${row.domain}`}
                              >
                                <Trash2 className="h-3 w-3" aria-hidden="true" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <nav
                  className="flex items-center justify-between pt-4"
                  aria-label="Pagination"
                >
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </nav>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Add Domain Dialog */}
        <Dialog
          open={isAddOpen}
          onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) resetAddDialog();
          }}
        >
          <DialogContent aria-describedby="add-domain-description">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldOff className="h-5 w-5" aria-hidden="true" />
                Block Email Domain
              </DialogTitle>
              <DialogDescription id="add-domain-description">
                Add a disposable or unwanted email domain to the sign-up blocklist.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="bulk-mode" className="text-sm font-medium">
                    Bulk add
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Paste multiple domains separated by spaces, commas, or newlines.
                  </p>
                </div>
                <Switch
                  id="bulk-mode"
                  checked={bulkMode}
                  onCheckedChange={setBulkMode}
                  aria-label="Toggle bulk add mode"
                />
              </div>

              {bulkMode ? (
                <div className="space-y-2">
                  <Label htmlFor="bulk-domains">Domains</Label>
                  <Textarea
                    id="bulk-domains"
                    value={bulkDomains}
                    onChange={(e) => setBulkDomains(e.target.value)}
                    placeholder={`mailinator.com\n10minutemail.com\ntempmail.org`}
                    rows={8}
                    className="font-mono"
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="new-domain">Domain</Label>
                    <Input
                      id="new-domain"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      placeholder="mailinator.com"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter just the domain. You can paste a full email address and we'll
                      extract the domain automatically.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-notes">Notes (optional)</Label>
                    <Textarea
                      id="new-notes"
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="Why is this domain being blocked?"
                      rows={3}
                    />
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  resetAddDialog();
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleAddDomain} disabled={submitting}>
                {submitting ? 'Adding...' : bulkMode ? 'Add Domains' : 'Add Domain'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog
          open={!!pendingDelete}
          onOpenChange={(open) => !open && setPendingDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove from blocklist?</AlertDialogTitle>
              <AlertDialogDescription>
                <span className="font-mono font-medium">{pendingDelete?.domain}</span> will
                no longer be blocked at sign-up. New accounts using this domain will be
                allowed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DashboardLayout>
    </RoleGuard>
  );
};

export default DisposableEmailDomains;
