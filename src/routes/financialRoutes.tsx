/**
 * Financial Management Routes
 * Invoices, estimates, reports, vendors, and financial tracking
 */

import { Route } from 'react-router-dom';
import {
  LazyFinancialDashboard,
  LazyEstimatesHub,
  LazyReports,
  LazyPurchaseOrders,
  LazyVendors,
  LazyQuickBooksRouting,
} from '@/utils/lazyRoutes';

export const financialRoutes = (
  <>
    {/* Financial Dashboard */}
    <Route path="/financial" element={<LazyFinancialDashboard />} />

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
