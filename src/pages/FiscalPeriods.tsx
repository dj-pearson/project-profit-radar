import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fiscalYearDefaults, fiscalYearFormSchema, type FiscalYearFormValues } from '@/lib/validations/accounting';
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
import { useFiscalYears, type FiscalYear, type FiscalPeriodRow } from '@/hooks/useFiscalYears';
import { ErrorState } from '@/components/common/ErrorState';
import { toast } from 'sonner';
import { confirmAction } from "@/components/ui/confirm-dialog";
import { Skeleton } from '@/components/ui/skeleton';

type FiscalPeriod = FiscalPeriodRow;

export default function FiscalPeriods() {
  const fiscal = useFiscalYears();
  const fiscalYears = fiscal.years.data;
  const allPeriods = fiscal.periods.data;
  const loadError = fiscal.years.error ?? fiscal.periods.error;
  const [isCreateYearDialogOpen, setIsCreateYearDialogOpen] = useState(false);

  // Form state for new fiscal year
  const yearForm = useForm<FiscalYearFormValues>({
    resolver: zodResolver(fiscalYearFormSchema),
    defaultValues: fiscalYearDefaults(new Date().getFullYear()),
  });

  const errorText = (error: unknown) => (error instanceof Error ? error.message : 'Unknown error');

  const handleCreateYear = async (values: FiscalYearFormValues) => {
    try {
      await fiscal.create.mutateAsync({
        yearNumber: Number(values.yearNumber),
        startDate: values.startDate,
        endDate: values.endDate,
      });
    } catch (error) {
      toast.error(`Failed to create fiscal year: ${errorText(error)}`);
      return;
    }
    toast.success('Fiscal year created successfully');
    setIsCreateYearDialogOpen(false);
    yearForm.reset(fiscalYearDefaults(new Date().getFullYear() + 1));
  };

  const handleClosePeriod = async (periodId: string) => {
    if (await confirmAction({ title: 'Are you sure you want to close this period?', description: 'No further transactions can be posted to it.', confirmLabel: 'Close period' })) {
      try {
        await fiscal.setClosed.mutateAsync({ periodId, closed: true });
        toast.success('Period closed successfully');
      } catch (error) {
        toast.error(`Failed to close period: ${errorText(error)}`);
      }
    }
  };

  const handleReopenPeriod = async (periodId: string) => {
    if (await confirmAction({ title: 'Are you sure you want to reopen this period?', description: 'This will allow new transactions to be posted.', confirmLabel: 'Reopen period' })) {
      try {
        await fiscal.setClosed.mutateAsync({ periodId, closed: false });
        toast.success('Period reopened successfully');
      } catch (error) {
        toast.error(`Failed to reopen period: ${errorText(error)}`);
      }
    }
  };

  // Group periods by fiscal year
  const periodsByYear = allPeriods?.reduce<Record<string | number, FiscalPeriod[]>>((acc, period) => {
    const yearNumber = (period as FiscalPeriod).fiscal_year?.year_number || 'Unknown';
    if (!acc[yearNumber]) {
      acc[yearNumber] = [];
    }
    acc[yearNumber].push(period as FiscalPeriod);
    return acc;
  }, {});

  const isLoading = fiscal.years.isLoading || fiscal.periods.isLoading;
  // Counts only from reads that came back; loading or failed shows '--'.
  const counted = !isLoading && !loadError;

  return (
    <main className="container mx-auto py-6 space-y-6" role="main" aria-label="Fiscal Periods Management">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="h-8 w-8" aria-hidden="true" />
            Fiscal Periods
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage fiscal years and accounting periods
          </p>
        </div>

        <Dialog open={isCreateYearDialogOpen} onOpenChange={setIsCreateYearDialogOpen}>
          <DialogTrigger asChild>
            <Button aria-label="Create new fiscal year">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              New Fiscal Year
            </Button>
          </DialogTrigger>
          <DialogContent aria-describedby="create-year-description">
            <Form {...yearForm}>
            <form onSubmit={yearForm.handleSubmit(handleCreateYear)} noValidate aria-label="Create fiscal year form">
              <DialogHeader>
                <DialogTitle>Create Fiscal Year</DialogTitle>
                <DialogDescription id="create-year-description">
                  Create a new fiscal year with monthly periods
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <FormField
                  control={yearForm.control}
                  name="yearNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" required aria-required="true" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={yearForm.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" required aria-required="true" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={yearForm.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" required aria-required="true" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Alert role="note">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
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
            </Form>
          </DialogContent>
        </Dialog>
      </header>

      {/* Info Alert */}
      <Alert role="note">
        <AlertDescription>
          <strong>Period Closing:</strong> Close periods to prevent further transactions from being
          posted. This is important for maintaining accurate financial records and ensuring
          period-over-period comparisons.
        </AlertDescription>
      </Alert>

      {/* Fiscal Years Summary */}
      <section aria-label="Fiscal year summary">
        <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Fiscal Years</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counted ? (fiscalYears?.length ?? 0) : '--'}</div>
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
              {counted ? (allPeriods?.filter(p => !p.is_closed).length ?? 0) : '--'}
            </div>
            <p className="text-xs text-muted-foreground">
              Available for transactions
            </p>
          </CardContent>
        </Card>
        </div>
      </section>

      {/* Fiscal Years and Periods */}
      <section aria-label="Fiscal years and periods">
        {loadError ? (
          <ErrorState
            title="Fiscal periods could not be loaded"
            error={errorText(loadError)}
            onRetry={() => { void fiscal.years.refetch(); void fiscal.periods.refetch(); }}
          />
        ) : isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-8" />)}</div>
            </CardContent>
          </Card>
        ) : fiscalYears && fiscalYears.length > 0 ? (
          <div className="space-y-6">
          {fiscalYears.map((year: FiscalYear) => (
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
                    <Badge variant="secondary" aria-label="Fiscal year is closed">
                      <Lock className="mr-2 h-3 w-3" aria-hidden="true" />
                      Closed
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Table aria-label={`Fiscal Year ${year.year_number} periods`}>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">Period</TableHead>
                      <TableHead scope="col">Period Name</TableHead>
                      <TableHead scope="col">Start Date</TableHead>
                      <TableHead scope="col">End Date</TableHead>
                      <TableHead scope="col">Status</TableHead>
                      <TableHead scope="col" className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periodsByYear?.[year.year_number]?.map((period: FiscalPeriod) => (
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
                            <Badge variant="secondary" aria-label="Period is closed">
                              <Lock className="mr-2 h-3 w-3" aria-hidden="true" />
                              Closed
                            </Badge>
                          ) : (
                            <Badge variant="default" aria-label="Period is open">
                              <Unlock className="mr-2 h-3 w-3" aria-hidden="true" />
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
                              aria-label={`Reopen ${period.period_name}`}
                            >
                              <Unlock className="mr-2 h-4 w-4" aria-hidden="true" />
                              Reopen
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleClosePeriod(period.id)}
                              aria-label={`Close ${period.period_name}`}
                            >
                              <Lock className="mr-2 h-4 w-4" aria-hidden="true" />
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
              <div className="text-center py-8 text-muted-foreground" role="status">
                No fiscal years found. Create your first fiscal year to get started.
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}
