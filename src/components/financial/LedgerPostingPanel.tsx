/**
 * Whether Brikly keeps this company's general ledger, and the two actions that
 * change it (US-334): turning automatic posting on or off, and posting the
 * history recorded before it was on. Both are admin/accounting only, enforced
 * by set_ledger_posting and backfill_ledger in the database; the buttons are
 * hidden from everyone else so nobody is offered an action that will refuse.
 */
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBackfillLedger, useLedgerPostingEnabled, useSetLedgerPosting } from '@/hooks/useAccounting';
import { POSTING_RULES } from '@/lib/ledgerPostingRules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const MANAGER_ROLES = ['admin', 'accounting', 'root_admin'];

export function LedgerPostingPanel({ companyId }: { companyId?: string }) {
  const { userProfile } = useAuth();
  const canManage = MANAGER_ROLES.includes(userProfile?.role ?? '');
  const { data: enabled, isLoading, isError } = useLedgerPostingEnabled(companyId);
  const setPosting = useSetLedgerPosting(companyId);
  const backfill = useBackfillLedger(companyId);
  const [fromDate, setFromDate] = useState(`${new Date().getFullYear()}-01-01`);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-lg">Ledger posting</CardTitle>
          {isLoading ? (
            <Skeleton className="h-6 w-16" />
          ) : isError ? (
            <Badge variant="outline">Unknown</Badge>
          ) : (
            <Badge variant={enabled ? 'default' : 'outline'}>{enabled ? 'On' : 'Off'}</Badge>
          )}
        </div>
        <CardDescription>
          {enabled
            ? 'Brikly posts sent invoices, customer payments, expenses, bills, bill payments and approved time to this ledger as they are saved. A void, a deletion or an edited amount posts a reversal; nothing is overwritten.'
            : 'Brikly is not keeping this ledger, so it holds only journal entries entered by hand. Leave it off if your books are in QuickBooks: posting here as well would count every transaction twice.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {canManage && !isLoading && !isError && (
          <div className="flex flex-wrap items-end gap-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant={enabled ? 'outline' : 'default'} disabled={setPosting.isPending}>
                  {enabled ? 'Turn posting off' : 'Turn posting on'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {enabled ? 'Stop posting to the ledger?' : 'Start posting to the ledger?'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {enabled
                      ? 'New documents will stop posting. Entries already posted stay where they are, so the statements will fall behind until posting is turned back on and history is posted again.'
                      : 'From now on every sent invoice, payment, expense, bill, bill payment and approved timesheet posts here. Only do this if Brikly, not QuickBooks, is where you keep your books. Documents from before today need "Post history" as well.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => setPosting.mutate(!enabled)}>
                    {enabled ? 'Turn off' : 'Turn on'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {enabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="ledger-backfill-from">Post history from</Label>
                  <Input
                    id="ledger-backfill-from"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-[200px]"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => backfill.mutate(fromDate)}
                  disabled={!fromDate || backfill.isPending}
                >
                  {backfill.isPending ? 'Posting history...' : 'Post history'}
                </Button>
                <p className="text-sm text-muted-foreground basis-full">
                  Posts documents dated on or after this date that have never been posted. Running it
                  again posts nothing twice.
                </p>
              </>
            )}
          </div>
        )}

        <details>
          <summary className="cursor-pointer text-sm font-medium">What posts where</summary>
          <Table className="mt-3" aria-label="Ledger posting rules">
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Document</TableHead>
                <TableHead scope="col">Debit</TableHead>
                <TableHead scope="col">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {POSTING_RULES.map((rule) => (
                <TableRow key={rule.source}>
                  <TableCell>{rule.source}</TableCell>
                  <TableCell>{rule.debit}</TableCell>
                  <TableCell>{rule.credit}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-sm text-muted-foreground">
            Accounts come from your chart by their standard numbers (1100 receivable, 2000 payable,
            4000 revenue, ...). A document whose account is missing is not posted rather than posted
            somewhere it does not belong. Approved time accrues to Accrued Wages; record the payroll
            run that pays it as a journal entry against that account.
          </p>
        </details>
      </CardContent>
    </Card>
  );
}
