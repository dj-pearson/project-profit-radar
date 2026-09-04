/**
 * Operations Routes
 * Safety, compliance, permits, equipment, and operational workflows
 *
 * ⚡ Performance: All routes are lazy-loaded to reduce initial bundle size
 */

import { Route } from 'react-router-dom';
import { RouteGuard } from '@/components/ProtectedRoute';
import { createLazyRoute } from '@/utils/lazyRoutes';

// Safety & Compliance - Lazy loaded with ErrorBoundary + Suspense
const Safety = createLazyRoute(() => import('@/pages/Safety'));
const ComplianceAudit = createLazyRoute(() => import('@/pages/ComplianceAudit'));
const GDPRCompliance = createLazyRoute(() => import('@/pages/GDPRCompliance'));

// Permits & Regulations - Lazy loaded with ErrorBoundary + Suspense
const PermitManagement = createLazyRoute(() => import('@/pages/PermitManagement'));
const EnvironmentalPermitting = createLazyRoute(() => import('@/pages/EnvironmentalPermitting'));
const BondInsuranceManagement = createLazyRoute(() => import('@/pages/BondInsuranceManagement'));
const WarrantyManagement = createLazyRoute(() => import('@/pages/WarrantyManagement'));
const PublicProcurement = createLazyRoute(() => import('@/pages/PublicProcurement'));

// Operations - Lazy loaded with ErrorBoundary + Suspense
const ServiceDispatch = createLazyRoute(() => import('@/pages/ServiceDispatch'));
const CalendarSync = createLazyRoute(() => import('@/pages/CalendarSync'));
const ProjectCalendar = createLazyRoute(() => import('@/pages/ProjectCalendar'));
const EquipmentManagement = createLazyRoute(() => import('@/pages/EquipmentManagement'));
const EquipmentQRLabels = createLazyRoute(() => import('@/pages/EquipmentQRLabels'));

// Advanced Features - Lazy loaded with ErrorBoundary + Suspense
const SmartClientUpdatesPage = createLazyRoute(() => import('@/pages/SmartClientUpdatesPage'));
const MaterialOrchestrationPage = createLazyRoute(() => import('@/pages/MaterialOrchestrationPage'));
const TradeHandoffPage = createLazyRoute(() => import('@/pages/TradeHandoffPage'));
const AIQualityControlPage = createLazyRoute(() => import('@/pages/AIQualityControlPage'));
const KnowledgeBase = createLazyRoute(() => import('@/pages/KnowledgeBase'));

export const operationsRoutes = (
  <>
    {/* Safety & Compliance */}
    <Route path="/safety" element={<RouteGuard><Safety /></RouteGuard>} />
    <Route path="/compliance-audit" element={<RouteGuard><ComplianceAudit /></RouteGuard>} />
    <Route path="/gdpr-compliance" element={<RouteGuard><GDPRCompliance /></RouteGuard>} />

    {/* Permits & Regulations */}
    <Route path="/permit-management" element={<RouteGuard><PermitManagement /></RouteGuard>} />
    <Route path="/environmental-permitting" element={<RouteGuard><EnvironmentalPermitting /></RouteGuard>} />
    <Route path="/bond-insurance" element={<RouteGuard><BondInsuranceManagement /></RouteGuard>} />
    <Route path="/warranty-management" element={<RouteGuard><WarrantyManagement /></RouteGuard>} />
    <Route path="/public-procurement" element={<RouteGuard><PublicProcurement /></RouteGuard>} />

    {/* Operations Management */}
    <Route path="/service-dispatch" element={<RouteGuard><ServiceDispatch /></RouteGuard>} />
    <Route path="/calendar" element={<RouteGuard><CalendarSync /></RouteGuard>} />
    <Route path="/project-calendar" element={<RouteGuard><ProjectCalendar /></RouteGuard>} />
    <Route path="/equipment-management" element={<RouteGuard><EquipmentManagement /></RouteGuard>} />
    <Route path="/equipment-qr-labels" element={<RouteGuard><EquipmentQRLabels /></RouteGuard>} />
    {/* /workflows is declared in appRoutes.tsx, which wins, and points at
        WorkflowAutomation - the one that reads the database. The declaration
        that used to sit here pointed at a 504-line page with zero Supabase
        calls and never rendered, so the sidebar's "Automated Workflows" item
        has always opened the real page. Removed with that page (US-331). */}

    {/* Advanced Operations */}
    <Route path="/smart-client-updates" element={<RouteGuard><SmartClientUpdatesPage /></RouteGuard>} />
    <Route path="/material-orchestration" element={<RouteGuard><MaterialOrchestrationPage /></RouteGuard>} />
    <Route path="/trade-handoff" element={<RouteGuard><TradeHandoffPage /></RouteGuard>} />
    <Route path="/ai-quality-control" element={<RouteGuard><AIQualityControlPage /></RouteGuard>} />
    <Route path="/knowledge-base" element={<RouteGuard><KnowledgeBase /></RouteGuard>} />
  </>
);
