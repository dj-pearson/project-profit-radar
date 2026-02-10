/**
 * Operations Routes
 * Safety, compliance, permits, equipment, and operational workflows
 *
 * ⚡ Performance: All routes are lazy-loaded to reduce initial bundle size
 */

import { Route } from 'react-router-dom';
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
const EquipmentManagement = createLazyRoute(() => import('@/pages/EquipmentManagement'));
const EquipmentQRLabels = createLazyRoute(() => import('@/pages/EquipmentQRLabels'));
const AutomatedWorkflows = createLazyRoute(() => import('@/pages/AutomatedWorkflows'));

// Advanced Features - Lazy loaded with ErrorBoundary + Suspense
const SmartClientUpdatesPage = createLazyRoute(() => import('@/pages/SmartClientUpdatesPage'));
const MaterialOrchestrationPage = createLazyRoute(() => import('@/pages/MaterialOrchestrationPage'));
const TradeHandoffPage = createLazyRoute(() => import('@/pages/TradeHandoffPage'));
const AIQualityControlPage = createLazyRoute(() => import('@/pages/AIQualityControlPage'));
const KnowledgeBase = createLazyRoute(() => import('@/pages/KnowledgeBase'));

export const operationsRoutes = (
  <>
    {/* Safety & Compliance */}
    <Route path="/safety" element={<Safety />} />
    <Route path="/compliance-audit" element={<ComplianceAudit />} />
    <Route path="/gdpr-compliance" element={<GDPRCompliance />} />

    {/* Permits & Regulations */}
    <Route path="/permit-management" element={<PermitManagement />} />
    <Route path="/environmental-permitting" element={<EnvironmentalPermitting />} />
    <Route path="/bond-insurance" element={<BondInsuranceManagement />} />
    <Route path="/warranty-management" element={<WarrantyManagement />} />
    <Route path="/public-procurement" element={<PublicProcurement />} />

    {/* Operations Management */}
    <Route path="/service-dispatch" element={<ServiceDispatch />} />
    <Route path="/calendar" element={<CalendarSync />} />
    <Route path="/equipment-management" element={<EquipmentManagement />} />
    <Route path="/equipment-qr-labels" element={<EquipmentQRLabels />} />
    <Route path="/workflows" element={<AutomatedWorkflows />} />

    {/* Advanced Operations */}
    <Route path="/smart-client-updates" element={<SmartClientUpdatesPage />} />
    <Route path="/material-orchestration" element={<MaterialOrchestrationPage />} />
    <Route path="/trade-handoff" element={<TradeHandoffPage />} />
    <Route path="/ai-quality-control" element={<AIQualityControlPage />} />
    <Route path="/knowledge-base" element={<KnowledgeBase />} />
  </>
);
