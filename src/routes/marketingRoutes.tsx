/**
 * Marketing & Landing Page Routes
 * Public-facing pages, pricing, features, comparisons, and resources
 *
 * ⚡ Performance: All marketing routes are lazy-loaded to reduce initial bundle size
 * These pages are only loaded when users navigate to them.
 */

import { Route } from 'react-router-dom';
import { lazy } from 'react';

// Marketing pages - Lazy loaded
const PricingPage = lazy(() => import('@/pages/Pricing'));
const PaymentCenter = lazy(() => import('@/pages/PaymentCenter'));
const FeaturesPage = lazy(() => import('@/pages/Features'));
const BlogPage = lazy(() => import('@/pages/Blog'));
const Resources = lazy(() => import('@/pages/Resources'));
const Solutions = lazy(() => import('@/pages/Solutions'));
const FAQ = lazy(() => import('@/pages/FAQ'));

// Industry-specific pages - Lazy loaded
const PlumbingContractorSoftware = lazy(() => import('@/pages/PlumbingContractorSoftware'));
const HVACContractorSoftware = lazy(() => import('@/pages/HVACContractorSoftware'));
const ElectricalContractorSoftware = lazy(() => import('@/pages/ElectricalContractorSoftware'));
const CommercialContractors = lazy(() => import('@/pages/CommercialContractors'));
const ResidentialContractors = lazy(() => import('@/pages/ResidentialContractors'));

// Feature-specific pages - Lazy loaded
const JobCostingSoftware = lazy(() => import('@/pages/JobCostingSoftware'));
const JobCostingSoftwareDetailed = lazy(() => import('@/pages/JobCostingSoftwareDetailed'));
const ConstructionManagementSoftwarePage = lazy(() => import('@/pages/ConstructionManagementSoftwarePage'));
const OSHAComplianceSoftware = lazy(() => import('@/pages/OSHAComplianceSoftware'));
const ConstructionFieldManagement = lazy(() => import('@/pages/ConstructionFieldManagement'));
const ConstructionSchedulingSoftware = lazy(() => import('@/pages/ConstructionSchedulingSoftware'));
const ConstructionProjectManagementSoftware = lazy(() => import('@/pages/ConstructionProjectManagementSoftware'));

// New SEO-optimized feature pages - Lazy loaded
const JobCostingPage = lazy(() => import('@/pages/features/JobCosting'));
const RealTimeBudgetingPage = lazy(() => import('@/pages/features/RealTimeBudgeting'));
const FinancialManagementPage = lazy(() => import('@/pages/features/FinancialManagement'));

// Comparison pages - Lazy loaded
const ProcoreAlternative = lazy(() => import('@/pages/ProcoreAlternative'));
const ProcoreAlternativeDetailed = lazy(() => import('@/pages/ProcoreAlternativeDetailed'));
const BuildertrendAlternative = lazy(() => import('@/pages/BuildertrendAlternative'));
const BuildertrendAlternativeDetailed = lazy(() => import('@/pages/BuildertrendAlternativeDetailed'));
const BuildDeskVsBuildertrend = lazy(() => import('@/pages/BuildDeskVsBuildertrend'));
const BuildDeskVsCoConstruct = lazy(() => import('@/pages/BuildDeskVsCoConstruct'));

// Resource pages - Lazy loaded
const BestConstructionManagementSoftware2025 = lazy(() => import('@/pages/resources/BestConstructionManagementSoftware2025'));
const JobCostingConstructionGuide = lazy(() => import('@/pages/resources/JobCostingConstructionGuide'));
const OSHASafetyLogsPlaybook = lazy(() => import('@/pages/resources/OSHASafetyLogsPlaybook'));
const ConstructionSchedulingSoftwareGuide = lazy(() => import('@/pages/resources/ConstructionSchedulingSoftwareGuide'));
const ConstructionDailyLogsGuide = lazy(() => import('@/pages/resources/ConstructionDailyLogsGuide'));
const ProcoreVsBuildDeskComparison = lazy(() => import('@/pages/resources/ProcoreVsBuildDeskComparison'));
const QuickBooksIntegrationGuide = lazy(() => import('@/pages/resources/QuickBooksIntegrationGuide'));
const ConstructionMobileAppGuide = lazy(() => import('@/pages/resources/ConstructionMobileAppGuide'));

// Phase 2: Financial Intelligence content pillar - Lazy loaded
const FinancialIntelligenceGuide = lazy(() => import('@/pages/resources/FinancialIntelligenceGuide'));
const RealCostDelayedJobCosting = lazy(() => import('@/pages/resources/RealCostDelayedJobCosting'));

// Phase 3: Financial Intelligence supporting articles - Lazy loaded
const BudgetVsActualTrackingGuide = lazy(() => import('@/pages/resources/BudgetVsActualTrackingGuide'));
const QuickBooksLimitationsConstruction = lazy(() => import('@/pages/resources/QuickBooksLimitationsConstruction'));
const CashFlowManagementGuide = lazy(() => import('@/pages/resources/CashFlowManagementGuide'));
const CalculateTrueProjectProfitability = lazy(() => import('@/pages/resources/CalculateTrueProjectProfitability'));
const ReadingFinancialStatementsGuide = lazy(() => import('@/pages/resources/ReadingFinancialStatementsGuide'));
const ConstructionROICalculatorGuide = lazy(() => import('@/pages/resources/ConstructionROICalculatorGuide'));

// Phase 4: Comparison and competitive content - Lazy loaded
const BestConstructionSoftwareSmallBusiness2025 = lazy(() => import('@/pages/resources/BestConstructionSoftwareSmallBusiness2025'));
const QuickBooksVsConstructionSoftware = lazy(() => import('@/pages/resources/QuickBooksVsConstructionSoftware'));
const JobCostingSoftwareComparison = lazy(() => import('@/pages/resources/JobCostingSoftwareComparison'));
const ProcoreAlternativeGEO = lazy(() => import('@/pages/resources/ProcoreAlternativeGEO'));
const BuildertrendAlternativeGEO = lazy(() => import('@/pages/resources/BuildertrendAlternativeGEO'));

// Phase 4: Ultimate Guides - Lazy loaded
const CompleteGuideConstructionJobCosting = lazy(() => import('@/pages/resources/CompleteGuideConstructionJobCosting'));
const ConstructionFinancialManagementGuide = lazy(() => import('@/pages/resources/ConstructionFinancialManagementGuide'));

// Topic pages - Lazy loaded
const ConstructionManagementBasics = lazy(() => import('@/pages/topics/ConstructionManagementBasics'));
const SafetyAndOSHACompliance = lazy(() => import('@/pages/topics/SafetyAndOSHACompliance'));

// Free Tools - Lazy loaded
const ProfitabilityCalculator = lazy(() => import('@/pages/ProfitabilityCalculator'));
const FinancialHealthCheckPage = lazy(() => import('@/pages/FinancialHealthCheck'));
const ROICalculatorLanding = lazy(() => import('@/pages/ROICalculatorLanding'));

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
    <Route path="/resources/calculate-true-project-profitability" element={<CalculateTrueProjectProfitability />} />
    <Route path="/resources/reading-financial-statements-guide" element={<ReadingFinancialStatementsGuide />} />
    <Route path="/resources/construction-roi-calculator-guide" element={<ConstructionROICalculatorGuide />} />

    {/* Phase 4: Comparison & Competitive Content */}
    <Route path="/resources/best-construction-software-small-business-2025" element={<BestConstructionSoftwareSmallBusiness2025 />} />
    <Route path="/resources/quickbooks-vs-construction-software" element={<QuickBooksVsConstructionSoftware />} />
    <Route path="/resources/job-costing-software-comparison" element={<JobCostingSoftwareComparison />} />
    <Route path="/resources/procore-alternative-complete-guide" element={<ProcoreAlternativeGEO />} />
    <Route path="/resources/buildertrend-alternative-complete-guide" element={<BuildertrendAlternativeGEO />} />

    {/* Phase 4: Ultimate Guides */}
    <Route path="/resources/complete-guide-construction-job-costing" element={<CompleteGuideConstructionJobCosting />} />
    <Route path="/resources/construction-financial-management-ultimate-guide" element={<ConstructionFinancialManagementGuide />} />

    {/* Topic Pages */}
    <Route path="/topics/construction-management-basics" element={<ConstructionManagementBasics />} />
    <Route path="/topics/safety-and-osha-compliance" element={<SafetyAndOSHACompliance />} />

    {/* Free Tools */}
    <Route path="/roi-calculator" element={<ROICalculatorLanding />} />
    <Route path="/calculator" element={<ProfitabilityCalculator />} />
    <Route path="/profitability-calculator" element={<ProfitabilityCalculator />} />
    <Route path="/financial-health-check" element={<FinancialHealthCheckPage />} />
    <Route path="/health-check" element={<FinancialHealthCheckPage />} />
  </>
);
