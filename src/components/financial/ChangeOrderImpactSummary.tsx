import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { FileEdit, TrendingUp, TrendingDown, Clock, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { formatCurrency } from '@/lib/utils';
import {
  summarizeChangeOrders, buildContractTimeline, type ChangeOrderInput,
} from '@/lib/projects/changeOrderImpact';

interface ChangeOrderImpactSummaryProps {
  projectId: string;
  /** Original contract amount (project budget). */
  originalContract: number;
}

export const ChangeOrderImpactSummary: React.FC<ChangeOrderImpactSummaryProps> = ({ projectId, originalContract }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<ChangeOrderInput[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('change_orders')
          .select('id, change_order_number, title, amount, status, client_approved, client_approved_date, internal_approved_date, created_at')
          .eq('project_id', projectId);
        if (error) throw error;
        if (active) setOrders((data ?? []) as ChangeOrderInput[]);
      } catch (error) {
        logger.error('Error loading change order impact', error instanceof Error ? error : undefined);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [projectId]);

  const summary = useMemo(() => summarizeChangeOrders(orders, originalContract), [orders, originalContract]);
  const timeline = useMemo(() => buildContractTimeline(orders, originalContract), [orders, originalContract]);

  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileEdit className="h-5 w-5 text-construction-orange" aria-hidden="true" />
          Change Order Impact
        </CardTitle>
        <button
          type="button"
          onClick={() => navigate('/change-orders')}
          className="text-sm text-construction-orange hover:underline flex items-center gap-1"
          aria-label="View all change orders"
        >
          {summary.approvedCount} approved
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Original Contract</div>
            <div className="text-lg font-bold">{formatCurrency(summary.originalContract)}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Approved Changes (net)</div>
            <div className={`text-lg font-bold ${summary.approvedTotal >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {summary.approvedTotal >= 0 ? '+' : ''}{formatCurrency(summary.approvedTotal)}
            </div>
            <div className="flex gap-2 text-[11px] text-muted-foreground mt-1">
              <span className="flex items-center gap-0.5"><TrendingUp className="h-3 w-3 text-green-600" aria-hidden="true" />{formatCurrency(summary.approvedAdditions)}</span>
              <span className="flex items-center gap-0.5"><TrendingDown className="h-3 w-3 text-destructive" aria-hidden="true" />{formatCurrency(summary.approvedDeductions)}</span>
            </div>
          </div>
          <div className="rounded-md border p-3 bg-muted/30">
            <div className="text-xs text-muted-foreground">Current Contract</div>
            <div className="text-lg font-bold">{formatCurrency(summary.currentContract)}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              Pending Changes
            </div>
            <div className="text-lg font-bold text-yellow-600">{formatCurrency(summary.pendingTotal)}</div>
            {summary.pendingCount > 0 && (
              <Badge variant="outline" className="mt-1 text-[11px]">{summary.pendingCount} pending</Badge>
            )}
          </div>
        </div>

        {timeline.length > 1 ? (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Contract amount over time</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={timeline} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} width={48} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Line type="stepAfter" dataKey="amount" stroke="#f97316" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No approved change orders yet. Approved changes will chart the contract amount over time here.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default ChangeOrderImpactSummary;
