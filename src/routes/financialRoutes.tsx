/**
 * Financial Management Routes
 * Invoices, estimates, reports, vendors, and financial tracking
 * NEW: Enterprise Finance Module - Chart of Accounts, GL, AP/AR, Bank Reconciliation
 */

import { Route } from 'react-router-dom';
import { lazy } from 'react';
import {
  LazyFinancialDashboard,
  LazyEstimatesHub,
  LazyInvoices,
  LazyReports,
  LazyPurchaseOrders,
  LazyVendors,
  LazyQuickBooksRouting,
} from '@/utils/lazyRoutes';

// Enterprise Finance Module - Lazy loaded
const FinanceHub = lazy(() => import('@/pages/FinanceHub'));
const ChartOfAccounts = lazy(() => import('@/pages/ChartOfAccounts'));
const JournalEntries = lazy(() => import('@/pages/JournalEntries'));
const BalanceSheet = lazy(() => import('@/pages/BalanceSheet'));
const ProfitAndLoss = lazy(() => import('@/pages/ProfitAndLoss'));
const TrialBalance = lazy(() => import('@/pages/TrialBalance'));
const AccountsPayable = lazy(() => import('@/pages/AccountsPayable'));
const GeneralLedger = lazy(() => import('@/pages/GeneralLedger'));
const CashFlowStatement = lazy(() => import('@/pages/CashFlowStatement'));
const BillPayments = lazy(() => import('@/pages/BillPayments'));
const FiscalPeriods = lazy(() => import('@/pages/FiscalPeriods'));

export const financialRoutes = (
  <>
    {/* Financial Dashboard */}
    <Route path="/financial" element={<LazyFinancialDashboard />} />

    {/* NEW: Enterprise Finance Hub */}
    <Route path="/finance-hub" element={<FinanceHub />} />
    <Route path="/finance/hub" element={<FinanceHub />} />

    {/* NEW: Chart of Accounts */}
    <Route path="/finance/chart-of-accounts" element={<ChartOfAccounts />} />

    {/* NEW: Journal Entries */}
    <Route path="/finance/journal-entries" element={<JournalEntries />} />

    {/* NEW: Accounts Payable */}
    <Route path="/finance/accounts-payable" element={<AccountsPayable />} />

    {/* NEW: General Ledger */}
    <Route path="/finance/general-ledger" element={<GeneralLedger />} />

    {/* NEW: Bill Payments */}
    <Route path="/finance/bill-payments" element={<BillPayments />} />

    {/* NEW: Fiscal Periods */}
    <Route path="/finance/fiscal-periods" element={<FiscalPeriods />} />

    {/* NEW: Financial Reports */}
    <Route path="/finance/balance-sheet" element={<BalanceSheet />} />
    <Route path="/finance/profit-loss" element={<ProfitAndLoss />} />
    <Route path="/finance/trial-balance" element={<TrialBalance />} />
    <Route path="/finance/cash-flow" element={<CashFlowStatement />} />

    {/* Estimates & Invoices */}
    <Route path="/estimates" element={<LazyEstimatesHub />} />
    <Route path="/invoices" element={<LazyInvoices />} />

    {/* Reports */}
    <Route path="/reports" element={<LazyReports />} />

    {/* Purchasing */}
    <Route path="/purchase-orders" element={<LazyPurchaseOrders />} />
    <Route path="/vendors" element={<LazyVendors />} />

    {/* Integrations */}
    <Route path="/quickbooks-routing" element={<LazyQuickBooksRouting />} />
  </>
);
