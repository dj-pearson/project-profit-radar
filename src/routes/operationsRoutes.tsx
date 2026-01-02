/**
 * Operations Routes
 * Safety, compliance, permits, equipment, and operational workflows
 *
 * ⚡ Performance: All routes are lazy-loaded to reduce initial bundle size
 */

import { Route } from 'react-router-dom';
import { lazy } from 'react';

// Safety & Compliance - Lazy loaded
const Safety = lazy(() => import('@/pages/Safety'));
const ComplianceAudit = lazy(() => import('@/pages/ComplianceAudit'));
const GDPRCompliance = lazy(() => import('@/pages/GDPRCompliance'));

// Permits & Regulations - Lazy loaded
const PermitManagement = lazy(() => import('@/pages/PermitManagement'));
const EnvironmentalPermitting = lazy(() => import('@/pages/EnvironmentalPermitting'));
const BondInsuranceManagement = lazy(() => import('@/pages/BondInsuranceManagement'));
const WarrantyManagement = lazy(() => import('@/pages/WarrantyManagement'));
const PublicProcurement = lazy(() => import('@/pages/PublicProcurement'));

// Operations - Lazy loaded
const ServiceDispatch = lazy(() => import('@/pages/ServiceDispatch'));
const CalendarSync = lazy(() => import('@/pages/CalendarSync'));
const EquipmentManagement = lazy(() => import('@/pages/EquipmentManagement'));
const EquipmentQRLabels = lazy(() => import('@/pages/EquipmentQRLabels'));
const AutomatedWorkflows = lazy(() => import('@/pages/AutomatedWorkflows'));

// Advanced Features - Lazy loaded
const SmartClientUpdatesPage = lazy(() => import('@/pages/SmartClientUpdatesPage'));
const MaterialOrchestrationPage = lazy(() => import('@/pages/MaterialOrchestrationPage'));
const TradeHandoffPage = lazy(() => import('@/pages/TradeHandoffPage'));
const AIQualityControlPage = lazy(() => import('@/pages/AIQualityControlPage'));
const KnowledgeBase = lazy(() => import('@/pages/KnowledgeBase'));

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
