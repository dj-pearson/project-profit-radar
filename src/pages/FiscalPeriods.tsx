import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFiscalPeriods } from '@/hooks/useAccounting';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, Plus, Lock, Unlock, Calendar } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateMonthlyPeriods } from '@/utils/accountingUtils';

export default function FiscalPeriods() {
  const { user } = useAuth();
  const companyId = user?.user_metadata?.company_id;
  const queryClient = useQueryClient();

  const [isCreateYearDialogOpen, setIsCreateYearDialogOpen] = useState(false);

  // Fetch fiscal years
  const { data: fiscalYears, isLoading: yearsLoading } = useQuery({
    queryKey: ['fiscal-years', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fiscal_years')
        .select('*')
        .eq('company_id', companyId)
        .order('year_number', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Fetch fiscal periods
  const { data: allPeriods, isLoading: periodsLoading } = useQuery({
    queryKey: ['fiscal-periods-all', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fiscal_periods')
        .select('*, fiscal_year:fiscal_years(year_number)')
        .eq('company_id', companyId)
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Form state for new fiscal year
  const [newYearData, setNewYearData] = useState({
    yearNumber: new Date().getFullYear(),
    startDate: `${new Date().getFullYear()}-01-01`,
    endDate: `${new Date().getFullYear()}-12-31`,
  });

  // Create fiscal year mutation
  const createFiscalYear = useMutation({
    mutationFn: async (yearData: any) => {
      // Create fiscal year
      const { data: fiscalYear, error: yearError } = await supabase
        .from('fiscal_years')
        .insert({
          company_id: companyId,
          year_number: yearData.yearNumber,
          start_date: yearData.startDate,
          end_date: yearData.endDate,
        })
        .select()
        .single();

      if (yearError) throw yearError;

      // Generate monthly periods
      const periods = generateMonthlyPeriods(
        new Date(yearData.startDate),
        new Date(yearData.endDate)
      );

      // Insert periods
      const periodInserts = periods.map(period => ({
        fiscal_year_id: fiscalYear.id,
        company_id: companyId,
        period_number: period.periodNumber,
        period_name: period.periodName,
        start_date: period.startDate.toISOString().split('T')[0],
        end_date: period.endDate.toISOString().split('T')[0],
      }));

      const { error: periodsError } = await supabase
        .from('fiscal_periods')
        .insert(periodInserts);

      if (periodsError) throw periodsError;

      return fiscalYear;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-years'] });
      queryClient.invalidateQueries({ queryKey: ['fiscal-periods-all'] });
      toast.success('Fiscal year created successfully');
      setIsCreateYearDialogOpen(false);
      setNewYearData({
        yearNumber: new Date().getFullYear() + 1,
        startDate: `${new Date().getFullYear() + 1}-01-01`,
        endDate: `${new Date().getFullYear() + 1}-12-31`,
      });
    },
    onError: (error: any) => {
      toast.error(`Failed to create fiscal year: ${error.message}`);
    },
  });

  // Close period mutation
  const closePeriod = useMutation({
    mutationFn: async (periodId: string) => {
      const { error } = await supabase
        .from('fiscal_periods')
        .update({
          is_closed: true,
          closed_at: new Date().toISOString(),
          closed_by: user?.id,
        })
        .eq('id', periodId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-periods-all'] });
      toast.success('Period closed successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to close period: ${error.message}`);
    },
  });

  // Reopen period mutation
  const reopenPeriod = useMutation({
    mutationFn: async (periodId: string) => {
      const { error } = await supabase
        .from('fiscal_periods')
        .update({
          is_closed: false,
          closed_at: null,
          closed_by: null,
        })
        .eq('id', periodId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-periods-all'] });
      toast.success('Period reopened successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to reopen period: ${error.message}`);
    },
  });

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    await createFiscalYear.mutateAsync(newYearData);
  };

  const handleClosePeriod = async (periodId: string) => {
    if (confirm('Are you sure you want to close this period? No further transactions can be posted to it.')) {
      await closePeriod.mutateAsync(periodId);
    }
  };

  const handleReopenPeriod = async (periodId: string) => {
    if (confirm('Are you sure you want to reopen this period? This will allow new transactions to be posted.')) {
      await reopenPeriod.mutateAsync(periodId);
    }
  };

  // Group periods by fiscal year
  const periodsByYear = allPeriods?.reduce((acc: any, period: any) => {
    const yearNumber = period.fiscal_year?.year_number || 'Unknown';
    if (!acc[yearNumber]) {
      acc[yearNumber] = [];
    }
    acc[yearNumber].push(period);
    return acc;
  }, {});

  const isLoading = yearsLoading || periodsLoading;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="h-8 w-8" />
            Fiscal Periods
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage fiscal years and accounting periods
          </p>
        </div>

        <Dialog open={isCreateYearDialogOpen} onOpenChange={setIsCreateYearDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Fiscal Year
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateYear}>
              <DialogHeader>
                <DialogTitle>Create Fiscal Year</DialogTitle>
                <DialogDescription>
                  Create a new fiscal year with monthly periods
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="yearNumber">Year</Label>
                  <Input
                    id="yearNumber"
                    type="number"
                    value={newYearData.yearNumber}
                    onChange={(e) =>
                      setNewYearData({
                        ...newYearData,
                        yearNumber: Number(e.target.value),
                      })
                    }
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={newYearData.startDate}
                      onChange={(e) =>
                        setNewYearData({ ...newYearData, startDate: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={newYearData.endDate}
                      onChange={(e) =>
                        setNewYearData({ ...newYearData, endDate: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <Alert>
                  <Calendar className="h-4 w-4" />
                  <AlertDescription>
                    This will create 12 monthly periods automatically based on the start and end dates.
                  </AlertDescription>
                </Alert>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateYearDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Fiscal Year</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertDescription>
          <strong>Period Closing:</strong> Close periods to prevent further transactions from being
          posted. This is important for maintaining accurate financial records and ensuring
          period-over-period comparisons.
        </AlertDescription>
      </Alert>

      {/* Fiscal Years Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Fiscal Years</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fiscalYears?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Year</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Date().getFullYear()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Open Periods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allPeriods?.filter(p => !p.is_closed).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Available for transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fiscal Years and Periods */}
      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">Loading fiscal periods...</div>
          </CardContent>
        </Card>
      ) : fiscalYears && fiscalYears.length > 0 ? (
        <div className="space-y-6">
          {fiscalYears.map((year: any) => (
            <Card key={year.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Fiscal Year {year.year_number}</CardTitle>
                    <CardDescription>
                      {new Date(year.start_date).toLocaleDateString()} -{' '}
                      {new Date(year.end_date).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  {year.is_closed && (
                    <Badge variant="secondary">
                      <Lock className="mr-2 h-3 w-3" />
                      Closed
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Period Name</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periodsByYear?.[year.year_number]?.map((period: any) => (
                      <TableRow key={period.id}>
                        <TableCell className="font-mono">
                          Period {period.period_number}
                        </TableCell>
                        <TableCell className="font-medium">{period.period_name}</TableCell>
                        <TableCell>
                          {new Date(period.start_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {new Date(period.end_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {period.is_closed ? (
                            <Badge variant="secondary">
                              <Lock className="mr-2 h-3 w-3" />
                              Closed
                            </Badge>
                          ) : (
                            <Badge variant="default">
                              <Unlock className="mr-2 h-3 w-3" />
                              Open
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {period.is_closed ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReopenPeriod(period.id)}
                            >
                              <Unlock className="mr-2 h-4 w-4" />
                              Reopen
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleClosePeriod(period.id)}
                            >
                              <Lock className="mr-2 h-4 w-4" />
                              Close
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              No fiscal years found. Create your first fiscal year to get started.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
