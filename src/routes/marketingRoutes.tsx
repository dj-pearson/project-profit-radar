/**
 * Marketing & Landing Page Routes
 * Public-facing pages, pricing, features, comparisons, and resources
 *
 * ⚡ Performance: All marketing routes are lazy-loaded to reduce initial bundle size
 * These pages are only loaded when users navigate to them.
 */

import { Route } from 'react-router-dom';
import { createLazyRoute, LazyPSEOPageRenderer } from '@/utils/lazyRoutes';

// Marketing pages - Lazy loaded with ErrorBoundary + Suspense
const PricingPage = createLazyRoute(() => import('@/pages/Pricing'));
const PaymentCenter = createLazyRoute(() => import('@/pages/PaymentCenter'));
const FeaturesPage = createLazyRoute(() => import('@/pages/Features'));
const BlogPage = createLazyRoute(() => import('@/pages/Blog'));
const Resources = createLazyRoute(() => import('@/pages/Resources'));
const Solutions = createLazyRoute(() => import('@/pages/Solutions'));
const FAQ = createLazyRoute(() => import('@/pages/FAQ'));

// Industry-specific pages - Lazy loaded with ErrorBoundary + Suspense
const PlumbingContractorSoftware = createLazyRoute(() => import('@/pages/PlumbingContractorSoftware'));
const HVACContractorSoftware = createLazyRoute(() => import('@/pages/HVACContractorSoftware'));
const ElectricalContractorSoftware = createLazyRoute(() => import('@/pages/ElectricalContractorSoftware'));
const CommercialContractors = createLazyRoute(() => import('@/pages/CommercialContractors'));
const ResidentialContractors = createLazyRoute(() => import('@/pages/ResidentialContractors'));

// Feature-specific pages - Lazy loaded with ErrorBoundary + Suspense
const JobCostingSoftware = createLazyRoute(() => import('@/pages/JobCostingSoftware'));
const JobCostingSoftwareDetailed = createLazyRoute(() => import('@/pages/JobCostingSoftwareDetailed'));
const ConstructionManagementSoftwarePage = createLazyRoute(() => import('@/pages/ConstructionManagementSoftwarePage'));
const OSHAComplianceSoftware = createLazyRoute(() => import('@/pages/OSHAComplianceSoftware'));
const ConstructionFieldManagement = createLazyRoute(() => import('@/pages/ConstructionFieldManagement'));
const ConstructionSchedulingSoftware = createLazyRoute(() => import('@/pages/ConstructionSchedulingSoftware'));
const ConstructionProjectManagementSoftware = createLazyRoute(() => import('@/pages/ConstructionProjectManagementSoftware'));

// New SEO-optimized feature pages - Lazy loaded with ErrorBoundary + Suspense
const JobCostingPage = createLazyRoute(() => import('@/pages/features/JobCosting'));
const RealTimeBudgetingPage = createLazyRoute(() => import('@/pages/features/RealTimeBudgeting'));
const FinancialManagementPage = createLazyRoute(() => import('@/pages/features/FinancialManagement'));

// Comparison pages - Lazy loaded with ErrorBoundary + Suspense
const ProcoreAlternative = createLazyRoute(() => import('@/pages/ProcoreAlternative'));
const ProcoreAlternativeDetailed = createLazyRoute(() => import('@/pages/ProcoreAlternativeDetailed'));
const BuildertrendAlternative = createLazyRoute(() => import('@/pages/BuildertrendAlternative'));
const BuildertrendAlternativeDetailed = createLazyRoute(() => import('@/pages/BuildertrendAlternativeDetailed'));
const BriklyVsBuildertrend = createLazyRoute(() => import('@/pages/BriklyVsBuildertrend'));
const BriklyVsCoConstruct = createLazyRoute(() => import('@/pages/BriklyVsCoConstruct'));

// Resource pages - Lazy loaded with ErrorBoundary + Suspense
const BestConstructionManagementSoftware2025 = createLazyRoute(() => import('@/pages/resources/BestConstructionManagementSoftware2025'));
const JobCostingConstructionGuide = createLazyRoute(() => import('@/pages/resources/JobCostingConstructionGuide'));
const OSHASafetyLogsPlaybook = createLazyRoute(() => import('@/pages/resources/OSHASafetyLogsPlaybook'));
const ConstructionSchedulingSoftwareGuide = createLazyRoute(() => import('@/pages/resources/ConstructionSchedulingSoftwareGuide'));
const ConstructionDailyLogsGuide = createLazyRoute(() => import('@/pages/resources/ConstructionDailyLogsGuide'));
const ProcoreVsBriklyComparison = createLazyRoute(() => import('@/pages/resources/ProcoreVsBriklyComparison'));
const QuickBooksIntegrationGuide = createLazyRoute(() => import('@/pages/resources/QuickBooksIntegrationGuide'));
const ConstructionMobileAppGuide = createLazyRoute(() => import('@/pages/resources/ConstructionMobileAppGuide'));

// Phase 2: Financial Intelligence content pillar
const FinancialIntelligenceGuide = createLazyRoute(() => import('@/pages/resources/FinancialIntelligenceGuide'));
const RealCostDelayedJobCosting = createLazyRoute(() => import('@/pages/resources/RealCostDelayedJobCosting'));

// Phase 3: Financial Intelligence supporting articles
const BudgetVsActualTrackingGuide = createLazyRoute(() => import('@/pages/resources/BudgetVsActualTrackingGuide'));
const QuickBooksLimitationsConstruction = createLazyRoute(() => import('@/pages/resources/QuickBooksLimitationsConstruction'));
const CashFlowManagementGuide = createLazyRoute(() => import('@/pages/resources/CashFlowManagementGuide'));
const CalculateTrueProjectProfitability = createLazyRoute(() => import('@/pages/resources/CalculateTrueProjectProfitability'));
const ReadingFinancialStatementsGuide = createLazyRoute(() => import('@/pages/resources/ReadingFinancialStatementsGuide'));
const ConstructionROICalculatorGuide = createLazyRoute(() => import('@/pages/resources/ConstructionROICalculatorGuide'));

// Phase 4: Comparison and competitive content
const BestConstructionSoftwareSmallBusiness2025 = createLazyRoute(() => import('@/pages/resources/BestConstructionSoftwareSmallBusiness2025'));
const QuickBooksVsConstructionSoftware = createLazyRoute(() => import('@/pages/resources/QuickBooksVsConstructionSoftware'));
const JobCostingSoftwareComparison = createLazyRoute(() => import('@/pages/resources/JobCostingSoftwareComparison'));
const ProcoreAlternativeGEO = createLazyRoute(() => import('@/pages/resources/ProcoreAlternativeGEO'));
const BuildertrendAlternativeGEO = createLazyRoute(() => import('@/pages/resources/BuildertrendAlternativeGEO'));

// Phase 4: Ultimate Guides
const CompleteGuideConstructionJobCosting = createLazyRoute(() => import('@/pages/resources/CompleteGuideConstructionJobCosting'));
const ConstructionFinancialManagementGuide = createLazyRoute(() => import('@/pages/resources/ConstructionFinancialManagementGuide'));

// Topic pages
const ConstructionManagementBasics = createLazyRoute(() => import('@/pages/topics/ConstructionManagementBasics'));
const SafetyAndOSHACompliance = createLazyRoute(() => import('@/pages/topics/SafetyAndOSHACompliance'));

// Free Tools
const ProfitabilityCalculator = createLazyRoute(() => import('@/pages/ProfitabilityCalculator'));
const FinancialHealthCheckPage = createLazyRoute(() => import('@/pages/FinancialHealthCheck'));
const ROICalculatorLanding = createLazyRoute(() => import('@/pages/ROICalculatorLanding'));

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
    <Route path="/brikly-vs-buildertrend-comparison" element={<BriklyVsBuildertrend />} />
    <Route path="/brikly-vs-coconstruct" element={<BriklyVsCoConstruct />} />

    {/* Resource Guides */}
    <Route path="/resources/best-construction-management-software-small-business-2025" element={<BestConstructionManagementSoftware2025 />} />
    <Route path="/resources/job-costing-construction-setup-guide" element={<JobCostingConstructionGuide />} />
    <Route path="/resources/osha-safety-logs-digital-playbook" element={<OSHASafetyLogsPlaybook />} />
    <Route path="/resources/construction-scheduling-software-prevent-delays" element={<ConstructionSchedulingSoftwareGuide />} />
    <Route path="/resources/construction-daily-logs-best-practices" element={<ConstructionDailyLogsGuide />} />
    <Route path="/resources/procore-vs-brikly-small-contractors" element={<ProcoreVsBriklyComparison />} />
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

    {/* pSEO (Programmatic SEO) Pages */}
    <Route path="/software/:dim1/:dim2" element={<LazyPSEOPageRenderer />} />
    <Route path="/compare/:competitorSlug" element={<LazyPSEOPageRenderer />} />
    <Route path="/features/:feature/:contractorType" element={<LazyPSEOPageRenderer />} />
  </>
);
