/**
 * Operations Routes
 * Safety, compliance, permits, equipment, and operational workflows
 */

import { Route } from 'react-router-dom';

// Safety & Compliance
import Safety from '@/pages/Safety';
import ComplianceAudit from '@/pages/ComplianceAudit';
import GDPRCompliance from '@/pages/GDPRCompliance';

// Permits & Regulations
import PermitManagement from '@/pages/PermitManagement';
import EnvironmentalPermitting from '@/pages/EnvironmentalPermitting';
import BondInsuranceManagement from '@/pages/BondInsuranceManagement';
import WarrantyManagement from '@/pages/WarrantyManagement';
import PublicProcurement from '@/pages/PublicProcurement';

// Operations
import ServiceDispatch from '@/pages/ServiceDispatch';
import CalendarSync from '@/pages/CalendarSync';
import EquipmentManagement from '@/pages/EquipmentManagement';
import AutomatedWorkflows from '@/pages/AutomatedWorkflows';

// Advanced Features
import SmartClientUpdatesPage from '@/pages/SmartClientUpdatesPage';
import MaterialOrchestrationPage from '@/pages/MaterialOrchestrationPage';
import TradeHandoffPage from '@/pages/TradeHandoffPage';
import AIQualityControlPage from '@/pages/AIQualityControlPage';
import KnowledgeBase from '@/pages/KnowledgeBase';

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
    <Route path="/workflows" element={<AutomatedWorkflows />} />

    {/* Advanced Operations */}
    <Route path="/smart-client-updates" element={<SmartClientUpdatesPage />} />
    <Route path="/material-orchestration" element={<MaterialOrchestrationPage />} />
    <Route path="/trade-handoff" element={<TradeHandoffPage />} />
    <Route path="/ai-quality-control" element={<AIQualityControlPage />} />
    <Route path="/knowledge-base" element={<KnowledgeBase />} />
  </>
);
