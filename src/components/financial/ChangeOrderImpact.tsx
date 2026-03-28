/**
 * Change Order Impact Summary (US-097)
 * Shows financial impact of change orders on a project's contract amount.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Clock, FileText } from 'lucide-react';

interface ChangeOrder {
  id: string;
  amount: number;
  status: string | null;
  created_at: string;
  description: string | null;
  change_order_number: string;
  internal_approved_date: string | null;
}

interface ChangeOrderImpactProps {
  projectId: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

export const ChangeOrderImpact: React.FC<ChangeOrderImpactProps> = ({ projectId }) => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [budget, setBudget] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [coResult, projResult] = await Promise.all([
          supabase
            .from('change_orders')
            .select('id, amount, status, created_at, description, change_order_number, internal_approved_date')
            .eq('project_id', projectId),
          supabase
            .from('projects')
            .select('budget')
            .eq('id', projectId)
            .single(),
        ]);

        if (coResult.data) setChangeOrders(coResult.data);
        if (projResult.data) setBudget(projResult.data.budget ?? 0);
      } catch (error) {
        console.error('Error fetching change order impact data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  const calculations = useMemo(() => {
    const approvedCOs = changeOrders.filter((co) => co.status === 'approved');
    const pendingCOs = changeOrders.filter(
      (co) => co.status === 'pending' || co.status === 'pending_approval' || co.status === 'draft'
    );

    const approvedAdditions = approvedCOs
      .filter((co) => co.amount > 0)
      .reduce((sum, co) => sum + co.amount, 0);

    const approvedDeductions = approvedCOs
      .filter((co) => co.amount < 0)
      .reduce((sum, co) => sum + co.amount, 0);

    const netApproved = approvedAdditions + approvedDeductions;
    const currentContract = budget + netApproved;

    const pendingTotal = pendingCOs.reduce((sum, co) => sum + co.amount, 0);

    // Build progression data for chart
    const sortedApproved = [...approvedCOs].sort(
      (a, b) =>
        new Date(a.internal_approved_date || a.created_at).getTime() -
        new Date(b.internal_approved_date || b.created_at).getTime()
    );

    const chartData: { date: string; amount: number }[] = [
      { date: 'Original', amount: budget },
    ];

    let running = budget;
    for (const co of sortedApproved) {
      running += co.amount;
      const dateStr = new Date(
        co.internal_approved_date || co.created_at
      ).toLocaleDateString();
      chartData.push({ date: dateStr, amount: running });
    }

    return {
      originalContract: budget,
      approvedAdditions,
      approvedDeductions,
      currentContract,
      pendingTotal,
      chartData,
    };
  }, [changeOrders, budget]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  const summaryCards = [
    {
      title: 'Original Contract',
      value: formatCurrency(calculations.originalContract),
      icon: DollarSign,
      color: 'text-primary',
      bgColor: '',
    },
    {
      title: 'Approved Additions',
      value: `+${formatCurrency(calculations.approvedAdditions)}`,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
    },
    {
      title: 'Approved Deductions',
      value: formatCurrency(calculations.approvedDeductions),
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
    },
    {
      title: 'Current Contract',
      value: formatCurrency(calculations.currentContract),
      icon: DollarSign,
      color: 'text-primary',
      bgColor: '',
    },
    {
      title: 'Pending COs',
      value: formatCurrency(calculations.pendingTotal),
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" aria-hidden="true" />
          Change Order Impact
        </h3>
        <Button variant="outline" size="sm" onClick={() => navigate('/change-orders')}>
          View Change Orders
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className={card.bgColor}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
                <card.icon className={`h-4 w-4 ${card.color}`} aria-hidden="true" />
              </div>
              <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contract Progression Chart */}
      {calculations.chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Contract Amount Progression
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calculations.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value: number) =>
                      `$${(value / 1000).toFixed(0)}k`
                    }
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Contract Amount']}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {changeOrders.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No change orders found for this project.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
