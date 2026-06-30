/**
 * Financial Management Routes
 * Invoices, estimates, reports, vendors, and financial tracking
 * NEW: Enterprise Finance Module - Chart of Accounts, GL, AP/AR, Bank Reconciliation
 */

import { Route } from 'react-router-dom';
import { RouteGuard } from '@/components/ProtectedRoute';
import {
  createLazyRoute,
  LazyFinancialDashboard,
  LazyEstimatesHub,
  LazyInvoices,
  LazyARAgingReport,
  LazyExpenses,
  LazyReports,
  LazyPurchaseOrders,
  LazyVendors,
  LazyQuickBooksRouting,
  LazyQuickBooksCallback,
  LazyFinancialOverview,
} from '@/utils/lazyRoutes';

// Enterprise Finance Module - Lazy loaded with ErrorBoundary + Suspense
const FinanceHub = createLazyRoute(() => import('@/pages/FinanceHub'));
const PurchaseOrderForm = createLazyRoute(() => import('@/components/purchasing/PurchaseOrderForm'));
const BidLeveling = createLazyRoute(() => import('@/pages/BidLeveling'));
const ExecutiveKpiDashboard = createLazyRoute(() => import('@/pages/ExecutiveKpiDashboard'));
const ChartOfAccounts = createLazyRoute(() => import('@/pages/ChartOfAccounts'));
const JournalEntries = createLazyRoute(() => import('@/pages/JournalEntries'));
const BalanceSheet = createLazyRoute(() => import('@/pages/BalanceSheet'));
const ProfitAndLoss = createLazyRoute(() => import('@/pages/ProfitAndLoss'));
const TrialBalance = createLazyRoute(() => import('@/pages/TrialBalance'));
const AccountsPayable = createLazyRoute(() => import('@/pages/AccountsPayable'));
const GeneralLedger = createLazyRoute(() => import('@/pages/GeneralLedger'));
const CashFlowStatement = createLazyRoute(() => import('@/pages/CashFlowStatement'));
const BillPayments = createLazyRoute(() => import('@/pages/BillPayments'));
const FiscalPeriods = createLazyRoute(() => import('@/pages/FiscalPeriods'));
const WipReport = createLazyRoute(() => import('@/pages/WipReport'));
const ExportCenter = createLazyRoute(() => import('@/pages/ExportCenter'));

export const financialRoutes = (
  <>
    {/* Financial Dashboard */}
    <Route path="/financial" element={<RouteGuard><LazyFinancialDashboard /></RouteGuard>} />

    {/* Company-Wide Financial Overview */}
    <Route path="/financial-overview" element={<RouteGuard><LazyFinancialOverview /></RouteGuard>} />

    {/* Enterprise Finance Hub */}
    <Route path="/finance-hub" element={<RouteGuard><FinanceHub /></RouteGuard>} />
    <Route path="/finance/hub" element={<RouteGuard><FinanceHub /></RouteGuard>} />

    {/* Chart of Accounts */}
    <Route path="/finance/chart-of-accounts" element={<RouteGuard><ChartOfAccounts /></RouteGuard>} />

    {/* Journal Entries */}
    <Route path="/finance/journal-entries" element={<RouteGuard><JournalEntries /></RouteGuard>} />

    {/* Accounts Payable */}
    <Route path="/finance/accounts-payable" element={<RouteGuard><AccountsPayable /></RouteGuard>} />

    {/* General Ledger */}
    <Route path="/finance/general-ledger" element={<RouteGuard><GeneralLedger /></RouteGuard>} />

    {/* Bill Payments */}
    <Route path="/finance/bill-payments" element={<RouteGuard><BillPayments /></RouteGuard>} />

    {/* Fiscal Periods */}
    <Route path="/finance/fiscal-periods" element={<RouteGuard><FiscalPeriods /></RouteGuard>} />

    {/* Financial Reports */}
    <Route path="/finance/balance-sheet" element={<RouteGuard><BalanceSheet /></RouteGuard>} />
    <Route path="/finance/profit-loss" element={<RouteGuard><ProfitAndLoss /></RouteGuard>} />
    <Route path="/finance/trial-balance" element={<RouteGuard><TrialBalance /></RouteGuard>} />
    <Route path="/finance/cash-flow" element={<RouteGuard><CashFlowStatement /></RouteGuard>} />
    <Route path="/finance/wip-report" element={<RouteGuard><WipReport /></RouteGuard>} />

    {/* Estimates & Invoices */}
    <Route path="/estimates" element={<RouteGuard><LazyEstimatesHub /></RouteGuard>} />
    <Route path="/bid-leveling" element={<RouteGuard><BidLeveling /></RouteGuard>} />
    <Route path="/invoices" element={<RouteGuard><LazyInvoices /></RouteGuard>} />
    <Route path="/invoices/aging" element={<RouteGuard><LazyARAgingReport /></RouteGuard>} />
    <Route path="/expenses" element={<RouteGuard><LazyExpenses /></RouteGuard>} />

    {/* Reports */}
    <Route path="/reports" element={<RouteGuard><LazyReports /></RouteGuard>} />
    <Route path="/export-center" element={<RouteGuard><ExportCenter /></RouteGuard>} />
    <Route path="/executive-dashboard" element={<RouteGuard><ExecutiveKpiDashboard /></RouteGuard>} />

    {/* Purchasing */}
    <Route path="/purchase-orders" element={<RouteGuard><LazyPurchaseOrders /></RouteGuard>} />
    <Route path="/purchase-orders/new" element={<RouteGuard><PurchaseOrderForm /></RouteGuard>} />
    <Route path="/purchase-orders/:id/edit" element={<RouteGuard><PurchaseOrderForm /></RouteGuard>} />
    <Route path="/vendors" element={<RouteGuard><LazyVendors /></RouteGuard>} />

    {/* Integrations */}
    <Route path="/quickbooks-routing" element={<LazyQuickBooksRouting />} />
    <Route path="/quickbooks/callback" element={<LazyQuickBooksCallback />} />
  </>
);
