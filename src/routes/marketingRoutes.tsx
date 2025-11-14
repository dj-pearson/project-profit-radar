/**
 * Marketing & Landing Page Routes
 * Public-facing pages, pricing, features, comparisons, and resources
 */

import { Route } from 'react-router-dom';

// Marketing pages
import PricingPage from '@/pages/Pricing';
import PaymentCenter from '@/pages/PaymentCenter';
import FeaturesPage from '@/pages/Features';
import BlogPage from '@/pages/Blog';
import Resources from '@/pages/Resources';
import Solutions from '@/pages/Solutions';
import FAQ from '@/pages/FAQ';

// Industry-specific pages
import PlumbingContractorSoftware from '@/pages/PlumbingContractorSoftware';
import HVACContractorSoftware from '@/pages/HVACContractorSoftware';
import ElectricalContractorSoftware from '@/pages/ElectricalContractorSoftware';
import CommercialContractors from '@/pages/CommercialContractors';
import ResidentialContractors from '@/pages/ResidentialContractors';

// Feature-specific pages
import JobCostingSoftware from '@/pages/JobCostingSoftware';
import JobCostingSoftwareDetailed from '@/pages/JobCostingSoftwareDetailed';
import ConstructionManagementSoftwarePage from '@/pages/ConstructionManagementSoftwarePage';
import OSHAComplianceSoftware from '@/pages/OSHAComplianceSoftware';
import ConstructionFieldManagement from '@/pages/ConstructionFieldManagement';
import ConstructionSchedulingSoftware from '@/pages/ConstructionSchedulingSoftware';
import ConstructionProjectManagementSoftware from '@/pages/ConstructionProjectManagementSoftware';

// New SEO-optimized feature pages
import JobCostingPage from '@/pages/features/JobCosting';
import RealTimeBudgetingPage from '@/pages/features/RealTimeBudgeting';
import FinancialManagementPage from '@/pages/features/FinancialManagement';

// Comparison pages
import ProcoreAlternative from '@/pages/ProcoreAlternative';
import ProcoreAlternativeDetailed from '@/pages/ProcoreAlternativeDetailed';
import BuildertrendAlternative from '@/pages/BuildertrendAlternative';
import BuildertrendAlternativeDetailed from '@/pages/BuildertrendAlternativeDetailed';
import BuildDeskVsBuildertrend from '@/pages/BuildDeskVsBuildertrend';
import BuildDeskVsCoConstruct from '@/pages/BuildDeskVsCoConstruct';

// Resource pages
import BestConstructionManagementSoftware2025 from '@/pages/resources/BestConstructionManagementSoftware2025';
import JobCostingConstructionGuide from '@/pages/resources/JobCostingConstructionGuide';
import OSHASafetyLogsPlaybook from '@/pages/resources/OSHASafetyLogsPlaybook';
import ConstructionSchedulingSoftwareGuide from '@/pages/resources/ConstructionSchedulingSoftwareGuide';
import ConstructionDailyLogsGuide from '@/pages/resources/ConstructionDailyLogsGuide';
import ProcoreVsBuildDeskComparison from '@/pages/resources/ProcoreVsBuildDeskComparison';
import QuickBooksIntegrationGuide from '@/pages/resources/QuickBooksIntegrationGuide';
import ConstructionMobileAppGuide from '@/pages/resources/ConstructionMobileAppGuide';

// Phase 2: Financial Intelligence content pillar
import FinancialIntelligenceGuide from '@/pages/resources/FinancialIntelligenceGuide';
import RealCostDelayedJobCosting from '@/pages/resources/RealCostDelayedJobCosting';

// Phase 3: Financial Intelligence supporting articles
import BudgetVsActualTrackingGuide from '@/pages/resources/BudgetVsActualTrackingGuide';
import QuickBooksLimitationsConstruction from '@/pages/resources/QuickBooksLimitationsConstruction';
import CashFlowManagementGuide from '@/pages/resources/CashFlowManagementGuide';

// Topic pages
import ConstructionManagementBasics from '@/pages/topics/ConstructionManagementBasics';
import SafetyAndOSHACompliance from '@/pages/topics/SafetyAndOSHACompliance';

// Free Tools
import ProfitabilityCalculator from '@/pages/ProfitabilityCalculator';
import FinancialHealthCheckPage from '@/pages/FinancialHealthCheck';

export const marketingRoutes = (
  <>
    {/* Core Marketing Pages */}
    <Route path="/pricing" element={<PricingPage />} />
    <Route path="/payment-center" element={<PaymentCenter />} />
    <Route path="/features" element={<FeaturesPage />} />
    <Route path="/blog" element={<BlogPage />} />
    <Route path="/solutions" element={<Solutions />} />
    <Route path="/faq" element={<FAQ />} />

    {/* Industry-Specific Pages */}
    <Route path="/plumbing-contractor-software" element={<PlumbingContractorSoftware />} />
    <Route path="/hvac-contractor-software" element={<HVACContractorSoftware />} />
    <Route path="/electrical-contractor-software" element={<ElectricalContractorSoftware />} />
    <Route path="/commercial-contractors" element={<CommercialContractors />} />
    <Route path="/residential-contractors" element={<ResidentialContractors />} />

    {/* Feature-Specific Pages */}
    <Route path="/job-costing-software" element={<JobCostingSoftwareDetailed />} />
    <Route path="/job-costing-software-simple" element={<JobCostingSoftware />} />
    <Route path="/construction-management-software" element={<ConstructionManagementSoftwarePage />} />
    <Route path="/osha-compliance-software" element={<OSHAComplianceSoftware />} />
    <Route path="/construction-field-management" element={<ConstructionFieldManagement />} />
    <Route path="/construction-scheduling-software" element={<ConstructionSchedulingSoftware />} />
    <Route path="/construction-project-management-software" element={<ConstructionProjectManagementSoftware />} />

    {/* New SEO-optimized feature pages (/features/*) */}
    <Route path="/features/job-costing" element={<JobCostingPage />} />
    <Route path="/features/real-time-budgeting" element={<RealTimeBudgetingPage />} />
    <Route path="/features/financial-management" element={<FinancialManagementPage />} />

    {/* Comparison Pages */}
    <Route path="/procore-alternative" element={<ProcoreAlternativeDetailed />} />
    <Route path="/procore-alternative-simple" element={<ProcoreAlternative />} />
    <Route path="/procore-alternative-detailed" element={<ProcoreAlternativeDetailed />} />
    <Route path="/buildertrend-alternative" element={<BuildertrendAlternativeDetailed />} />
    <Route path="/buildertrend-alternative-simple" element={<BuildertrendAlternative />} />
    <Route path="/builddesk-vs-buildertrend-comparison" element={<BuildDeskVsBuildertrend />} />
    <Route path="/builddesk-vs-coconstruct" element={<BuildDeskVsCoConstruct />} />

    {/* Resource Guides */}
    <Route path="/resources/best-construction-management-software-small-business-2025" element={<BestConstructionManagementSoftware2025 />} />
    <Route path="/resources/job-costing-construction-setup-guide" element={<JobCostingConstructionGuide />} />
    <Route path="/resources/osha-safety-logs-digital-playbook" element={<OSHASafetyLogsPlaybook />} />
    <Route path="/resources/construction-scheduling-software-prevent-delays" element={<ConstructionSchedulingSoftwareGuide />} />
    <Route path="/resources/construction-daily-logs-best-practices" element={<ConstructionDailyLogsGuide />} />
    <Route path="/resources/procore-vs-builddesk-small-contractors" element={<ProcoreVsBuildDeskComparison />} />
    <Route path="/resources/quickbooks-integration-guide" element={<QuickBooksIntegrationGuide />} />
    <Route path="/resources/construction-mobile-app-guide" element={<ConstructionMobileAppGuide />} />

    {/* Financial Intelligence Pillar (Phase 2 SEO Strategy) */}
    <Route path="/resources/financial-intelligence-guide" element={<FinancialIntelligenceGuide />} />
    <Route path="/resources/real-cost-delayed-job-costing" element={<RealCostDelayedJobCosting />} />

    {/* Financial Intelligence Supporting Articles (Phase 3) */}
    <Route path="/resources/budget-vs-actual-tracking-guide" element={<BudgetVsActualTrackingGuide />} />
    <Route path="/resources/quickbooks-limitations-construction" element={<QuickBooksLimitationsConstruction />} />
    <Route path="/resources/cash-flow-management-guide" element={<CashFlowManagementGuide />} />

    {/* Topic Pages */}
    <Route path="/topics/construction-management-basics" element={<ConstructionManagementBasics />} />
    <Route path="/topics/safety-and-osha-compliance" element={<SafetyAndOSHACompliance />} />

    {/* Free Tools */}
    <Route path="/calculator" element={<ProfitabilityCalculator />} />
    <Route path="/profitability-calculator" element={<ProfitabilityCalculator />} />
    <Route path="/financial-health-check" element={<FinancialHealthCheckPage />} />
    <Route path="/health-check" element={<FinancialHealthCheckPage />} />
  </>
);
