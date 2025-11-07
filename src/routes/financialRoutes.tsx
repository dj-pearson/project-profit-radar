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
  LazyReports,
  LazyPurchaseOrders,
  LazyVendors,
  LazyQuickBooksRouting,
} from '@/utils/lazyRoutes';

// Enterprise Finance Module - Lazy loaded
const FinanceHub = lazy(() => import('@/pages/FinanceHub'));
const ChartOfAccounts = lazy(() => import('@/pages/ChartOfAccounts'));

export const financialRoutes = (
  <>
    {/* Financial Dashboard */}
    <Route path="/financial" element={<LazyFinancialDashboard />} />

    {/* NEW: Enterprise Finance Hub */}
    <Route path="/finance-hub" element={<FinanceHub />} />
    <Route path="/finance/hub" element={<FinanceHub />} />

    {/* NEW: Chart of Accounts */}
    <Route path="/finance/chart-of-accounts" element={<ChartOfAccounts />} />

    {/* Estimates & Invoices */}
    <Route path="/estimates" element={<LazyEstimatesHub />} />

    {/* Reports */}
    <Route path="/reports" element={<LazyReports />} />

    {/* Purchasing */}
    <Route path="/purchase-orders" element={<LazyPurchaseOrders />} />
    <Route path="/vendors" element={<LazyVendors />} />

    {/* Integrations */}
    <Route path="/quickbooks-routing" element={<LazyQuickBooksRouting />} />
  </>
);
