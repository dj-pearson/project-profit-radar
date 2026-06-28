import { useEffect, useMemo, useState } from 'react';
import { History, Eye, GitCompare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { fetchEstimateVersions, type EstimateVersionRow } from '@/services/estimateVersions';
import { diffLineItems, summarizeDiff, type LineItemChangeKind } from '@/lib/estimate-versions';

interface EstimateVersionHistoryProps {
  estimateId: string;
  companyId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROW_BG: Record<LineItemChangeKind, string> = {
  added: 'bg-green-500/10',
  removed: 'bg-red-500/10',
  changed: 'bg-yellow-500/10',
  unchanged: '',
};

/**
 * US-096: estimate version history panel with read-only view and side-by-side
 * comparison (added=green, removed=red, changed=yellow).
 */
export function EstimateVersionHistory({ estimateId, companyId, open, onOpenChange }: EstimateVersionHistoryProps) {
  const [versions, setVersions] = useState<EstimateVersionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [viewing, setViewing] = useState<EstimateVersionRow | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(false);
    setVersions([]); // avoid showing a previous estimate's list during refetch
    setViewing(null);
    setSelected([]);
    setComparing(false);
    fetchEstimateVersions(estimateId, companyId)
      .then(setVersions)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [open, estimateId, companyId]);

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : [prev[1], id]
    );
  };

  const compareDiff = useMemo(() => {
    if (selected.length !== 2) return null;
    const picked = versions.filter((v) => selected.includes(v.id)).sort((a, b) => a.version_number - b.version_number);
    if (picked.length !== 2) return null;
    const [older, newer] = picked;
    return {
      older,
      newer,
      diffs: diffLineItems(older.snapshot?.lineItems ?? [], newer.snapshot?.lineItems ?? []),
    };
  }, [selected, versions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" aria-hidden="true" /> Estimate Version History
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : error ? (
          <p className="py-6 text-center text-destructive">
            Couldn't load version history. Please try again.
          </p>
        ) : viewing ? (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="font-medium">Version v{viewing.version_number} (read-only)</p>
              <Button size="sm" variant="outline" onClick={() => setViewing(null)}>Back</Button>
            </div>
            <SnapshotTable items={viewing.snapshot?.lineItems ?? []} />
          </div>
        ) : comparing && compareDiff ? (
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">
                Comparing v{compareDiff.older.version_number} → v{compareDiff.newer.version_number}
              </p>
              <div className="flex items-center gap-2">
                {(() => {
                  const s = summarizeDiff(compareDiff.diffs);
                  return (
                    <>
                      <Badge className="bg-green-500/15 text-green-700">+{s.added}</Badge>
                      <Badge className="bg-red-500/15 text-red-700">−{s.removed}</Badge>
                      <Badge className="bg-yellow-500/15 text-yellow-700">~{s.changed}</Badge>
                    </>
                  );
                })()}
                <Button size="sm" variant="outline" onClick={() => setComparing(false)}>Back</Button>
              </div>
            </div>
            <div className="max-h-[55vh] overflow-y-auto rounded border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-2">Item</th>
                    <th className="p-2">Before</th>
                    <th className="p-2">After</th>
                    <th className="p-2">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {compareDiff.diffs.map((d) => (
                    <tr key={d.key} className={cn('border-t', ROW_BG[d.kind])}>
                      <td className="p-2 font-medium">{(d.after ?? d.before)?.item_name}</td>
                      <td className="p-2 text-muted-foreground">{fmt(d.before)}</td>
                      <td className="p-2 text-muted-foreground">{fmt(d.after)}</td>
                      <td className="p-2 capitalize">{d.kind === 'changed' ? `changed: ${d.changedFields.join(', ')}` : d.kind}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {versions.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">No saved versions yet.</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Select two versions to compare.</p>
                  <Button size="sm" disabled={selected.length !== 2} onClick={() => setComparing(true)}>
                    <GitCompare className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Compare
                  </Button>
                </div>
                <div className="divide-y rounded border">
                  {versions.map((v) => (
                    <div key={v.id} className="flex items-center gap-3 p-2">
                      <Checkbox
                        checked={selected.includes(v.id)}
                        onCheckedChange={() => toggleSelect(v.id)}
                        aria-label={`Select version ${v.version_number} to compare`}
                      />
                      <div className="flex-1">
                        <span className="font-medium">v{v.version_number}</span>{' '}
                        <span className="text-sm text-muted-foreground">
                          · {new Date(v.created_at).toLocaleString()} · {v.editorName ?? 'Unknown'}
                        </span>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setViewing(v)}>
                        <Eye className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> View
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function fmt(
  item:
    | {
        quantity?: number | null;
        unit_cost?: number | null;
        unit?: string | null;
        category?: string | null;
        description?: string | null;
      }
    | null
): string {
  if (!item) return '—';
  const parts = [
    `${item.quantity ?? 0} ${item.unit ?? ''}`.trim() + ` × $${item.unit_cost ?? 0}`,
    item.category ? `cat: ${item.category}` : '',
    item.description ? `“${item.description}”` : '',
  ].filter(Boolean);
  return parts.join(' · ');
}

function SnapshotTable({ items }: { items: { item_name: string; quantity?: number | null; unit_cost?: number | null }[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">No line items.</p>;
  return (
    <div className="max-h-[55vh] overflow-y-auto rounded border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="p-2">Item</th>
            <th className="p-2">Qty</th>
            <th className="p-2">Unit cost</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i} className="border-t">
              <td className="p-2">{it.item_name}</td>
              <td className="p-2">{it.quantity ?? 0}</td>
              <td className="p-2">${it.unit_cost ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default EstimateVersionHistory;
