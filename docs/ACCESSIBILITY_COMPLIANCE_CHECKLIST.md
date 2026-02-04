# Accessibility Compliance Checklist

**Last Updated:** February 3, 2026
**Current Status:** Partial Implementation
**Target:** WCAG 2.1 Level AA

---

## Executive Summary

BuildDesk has accessibility infrastructure (components, hooks, testing utilities) but **implementation is inconsistent**. Only 2 of 100+ pages currently use the accessible component library.

| Metric | Current | Target |
|--------|---------|--------|
| Pages using AccessibleModal | 2 | 67 |
| Pages using AccessibleForm | 1 | 17 |
| Pages using AccessibleTable | 0 | 14 |
| Pages using AccessiblePageWrapper | 0 | All |

---

## Available Accessible Components

Located in `src/components/accessibility/`:

| Component | Purpose | Usage |
|-----------|---------|-------|
| `AccessibleModal` | Modals with focus trap, escape handling, ARIA | Replace Dialog/Sheet |
| `AccessibleForm` | Forms with live region announcements | Replace standard forms |
| `AccessibleFormField` | Inputs with proper labels, aria-invalid | Replace Input components |
| `AccessibleSelect` | Native select with accessibility | Replace Select components |
| `AccessibleTextarea` | Textarea with accessibility features | Replace Textarea |
| `AccessibleTable` | Tables with ARIA, sorting, keyboard nav | Replace Table components |
| `AccessiblePageWrapper` | Semantic HTML landmarks | Wrap all pages |
| `SkipLinks` | Skip navigation for keyboard users | Add to layout |
| `AccessibilityPanel` | User accessibility preferences | Already in settings |
| `AccessibilityProvider` | Context for accessibility settings | Already in app |

---

## Priority 1: Critical Path Pages (User-Facing Daily Use)

These pages are used daily and must be remediated first.

### Authentication & Setup
| Page | File | Has Modal | Has Form | Has Table | Status |
|------|------|-----------|----------|-----------|--------|
| Auth | `Auth.tsx` | No | Yes | No | **UPDATED** - ARIA labels, semantic HTML |
| Setup | `Setup.tsx` | No | Yes | No | **UPDATED** - Landmarks, form ARIA |
| Reset Password | `ResetPassword.tsx` | No | Yes | No | **UPDATED** - Landmarks, form ARIA |

### Core Application
| Page | File | Has Modal | Has Form | Has Table | Status |
|------|------|-----------|----------|-----------|--------|
| Dashboard | `Dashboard.tsx` | No | No | No | **UPDATED** - Landmarks, ARIA labels |
| My Tasks | `MyTasks.tsx` | Yes | Yes | No | **COMPLIANT** - Full accessible components |
| Projects | `Projects.tsx` | Yes | Yes | No | **UPDATED** - Cards, search, tabs ARIA |
| Project Detail | `ProjectDetail.tsx` | Yes | No | No | **UPDATED** - Landmarks, Sheet ARIA |
| Create Project | `CreateProject.tsx` | No | Yes | No | **UPDATED** - Form ARIA, icons |
| Timesheets | `Timesheets.tsx` | Yes | No | Yes | **UPDATED** - Table, stats, tabs ARIA |
| Daily Reports | `DailyReports.tsx` | Yes | No | No | **UPDATED** - Dialog, form, cards ARIA |

---

## Priority 2: Financial Pages (High-Risk Data)

Financial pages handle sensitive data and require proper error handling.

| Page | File | Has Modal | Has Form | Has Table | Status |
|------|------|-----------|----------|-----------|--------|
| Finance Hub | `FinanceHub.tsx` | Yes | Yes | No | **UPDATED** - Landmarks, tabs, cards ARIA |
| Chart of Accounts | `ChartOfAccounts.tsx` | Yes | Yes | Yes | **UPDATED** - Dialog, table, form ARIA |
| Journal Entries | `JournalEntries.tsx` | Yes | Yes | Yes | **UPDATED** - Dialog, table, form ARIA |
| Bill Payments | `BillPayments.tsx` | Yes | Yes | Yes | **UPDATED** - Dialog, table, metrics ARIA |
| Accounts Payable | `AccountsPayable.tsx` | Yes | Yes | Yes | **UPDATED** - Dialog, table, metrics ARIA |
| Balance Sheet | `BalanceSheet.tsx` | Yes | No | Yes | **UPDATED** - Landmarks, table, alerts ARIA |
| Profit and Loss | `ProfitAndLoss.tsx` | No | No | Yes | **UPDATED** - Landmarks, table, metrics ARIA |
| Cash Flow | `CashFlowStatement.tsx` | No | No | Yes | Needs AccessibleTable |
| Fiscal Periods | `FiscalPeriods.tsx` | Yes | Yes | Yes | Needs all accessible components |
| General Ledger | `GeneralLedger.tsx` | No | No | Yes | **UPDATED** - Landmarks, table, filters ARIA |
| Trial Balance | `TrialBalance.tsx` | No | No | Yes | **UPDATED** - Landmarks, table, balance alerts ARIA |
| Budget Management | `BudgetManagement.tsx` | No | No | No | Needs PageWrapper, ARIA |
| Financial Reports | `FinancialReports.tsx` | No | No | No | Needs PageWrapper, ARIA |
| Payroll | `Payroll.tsx` | No | No | No | Needs PageWrapper, ARIA |
| Tax Management | `TaxManagement.tsx` | No | No | No | Needs PageWrapper, ARIA |

---

## Priority 3: CRM & Sales Pages

| Page | File | Has Modal | Has Form | Has Table | Status |
|------|------|-----------|----------|-----------|--------|
| CRM Dashboard | `CRMDashboard.tsx` | Yes | Yes | No | Needs all accessible components |
| CRM Leads | `CRMLeads.tsx` | Yes | No | Yes | Needs AccessibleModal, Table |
| CRM Contacts | `CRMContacts.tsx` | Yes | No | No | Needs AccessibleModal |
| CRM Opportunities | `CRMOpportunities.tsx` | Yes | No | No | Needs AccessibleModal |
| Lead Management | `LeadManagement.tsx` | No | No | No | Needs PageWrapper, ARIA |
| Contact Management | `ContactManagement.tsx` | No | No | No | Needs PageWrapper, ARIA |
| CRM Analytics | `CRMAnalytics.tsx` | No | No | No | Needs PageWrapper, ARIA |
| CRM Campaigns | `CRMCampaigns.tsx` | No | No | No | Needs PageWrapper, ARIA |
| CRM Workflows | `CRMWorkflows.tsx` | No | No | No | Needs PageWrapper, ARIA |
| CRM Lead Intelligence | `CRMLeadIntelligence.tsx` | No | No | No | Needs PageWrapper, ARIA |

---

## Priority 4: Admin Pages

| Page | File | Has Modal | Has Form | Has Table | Status |
|------|------|-----------|----------|-----------|--------|
| Users | `admin/Users.tsx` | Yes | No | No | Needs AccessibleModal |
| Companies | `admin/Companies.tsx` | Yes | No | No | Needs AccessibleModal |
| SSO Management | `admin/SSOManagement.tsx` | Yes | No | No | Needs AccessibleModal |
| Tenant Management | `admin/TenantManagement.tsx` | Yes | No | No | Needs AccessibleModal |
| Lead Management | `admin/LeadManagement.tsx` | Yes | No | Yes | Needs AccessibleModal, Table |
| Support Tickets | `admin/SupportTickets.tsx` | Yes | No | No | Needs AccessibleModal |
| Funnel Manager | `admin/FunnelManager.tsx` | Yes | Yes | No | Needs all accessible components |
| Promotions | `admin/Promotions.tsx` | Yes | Yes | No | Needs all accessible components |
| Billing | `admin/Billing.tsx` | Yes | No | No | Needs AccessibleModal |
| AI Model Manager | `admin/AIModelManager.tsx` | No | No | No | Needs PageWrapper, ARIA |
| Social Media Manager | `admin/SocialMediaManager.tsx` | No | No | No | Needs PageWrapper, ARIA |
| Analytics | `admin/Analytics.tsx` | No | No | No | Needs PageWrapper, ARIA |

---

## Priority 5: Operations Pages

| Page | File | Has Modal | Has Form | Has Table | Status |
|------|------|-----------|----------|-----------|--------|
| Team Management | `TeamManagement.tsx` | Yes | Yes | No | Needs all accessible components |
| Crew Scheduling | `CrewScheduling.tsx` | Yes | No | No | Needs AccessibleModal |
| Equipment | `Equipment.tsx` | Yes | No | No | Needs AccessibleModal |
| Equipment Management | `EquipmentManagement.tsx` | Yes | No | No | Needs AccessibleModal |
| Equipment Tracking | `EquipmentTracking.tsx` | Yes | No | No | Needs AccessibleModal |
| Materials | `Materials.tsx` | Yes | No | No | Needs AccessibleModal |
| Material Tracking | `MaterialTracking.tsx` | Yes | No | No | Needs AccessibleModal |
| Safety | `Safety.tsx` | Yes | No | No | Needs AccessibleModal |
| Safety Management | `SafetyManagement.tsx` | Yes | No | No | Needs AccessibleModal |
| Punch List | `PunchList.tsx` | Yes | No | No | Needs AccessibleModal |
| Change Orders | `ChangeOrders.tsx` | Yes | No | No | Needs AccessibleModal |
| Submittals | `Submittals.tsx` | Yes | No | No | Needs AccessibleModal |
| RFIs | `RFIs.tsx` | Yes | No | No | Needs AccessibleModal |
| Reports | `Reports.tsx` | Yes | No | No | Needs AccessibleModal |
| Document Management | `DocumentManagement.tsx` | Yes | Yes | No | Needs all accessible components |
| Estimates Hub | `EstimatesHub.tsx` | Yes | No | No | Needs AccessibleModal |

---

## Priority 6: Compliance & Legal Pages

| Page | File | Has Modal | Has Form | Has Table | Status |
|------|------|-----------|----------|-----------|--------|
| GDPR Compliance | `GDPRCompliance.tsx` | Yes | No | No | Needs AccessibleModal |
| Permit Management | `PermitManagement.tsx` | Yes | No | No | Needs AccessibleModal |
| Environmental Permitting | `EnvironmentalPermitting.tsx` | Yes | No | No | Needs AccessibleModal |
| Bond Insurance | `BondInsuranceManagement.tsx` | Yes | No | No | Needs AccessibleModal |
| Warranty Management | `WarrantyManagement.tsx` | Yes | No | No | Needs AccessibleModal |
| Compliance Audit | `ComplianceAudit.tsx` | Yes | No | No | Needs AccessibleModal |
| Audit Logs | `AuditLogs.tsx` | No | No | No | Needs PageWrapper, ARIA |
| Public Procurement | `PublicProcurement.tsx` | Yes | No | No | Needs AccessibleModal |

---

## Priority 7: Vendor & Purchasing Pages

| Page | File | Has Modal | Has Form | Has Table | Status |
|------|------|-----------|----------|-----------|--------|
| Vendors | `Vendors.tsx` | Yes | No | No | Needs AccessibleModal |
| Vendor Management | `VendorManagement.tsx` | No | No | No | Needs PageWrapper, ARIA |
| Purchase Orders | `PurchaseOrders.tsx` | Yes | No | No | Needs AccessibleModal |

---

## Priority 8: Marketing & Public Pages

These pages are customer-facing and impact SEO/perception.

| Page | File | Has Modal | Has Form | Has Table | Status |
|------|------|-----------|----------|-----------|--------|
| Landing | `Landing.tsx` | No | No | No | Needs PageWrapper, ARIA |
| Features | `Features.tsx` | No | No | No | Needs PageWrapper, ARIA |
| Solutions | `Solutions.tsx` | No | No | No | Needs PageWrapper, ARIA |
| Pricing | `Pricing.tsx` | No | No | No | Needs PageWrapper, ARIA |
| FAQ | `FAQ.tsx` | No | No | No | Needs PageWrapper, ARIA |
| Blog | `Blog.tsx` | No | No | No | Needs PageWrapper, ARIA |
| Blog Post | `BlogPost.tsx` | No | No | No | Needs PageWrapper, ARIA |
| Blog Manager | `BlogManager.tsx` | Yes | No | No | Needs AccessibleModal |
| Support | `Support.tsx` | Yes | No | No | Needs AccessibleModal |
| Contact | `Contact.tsx` | No | No | No | Needs PageWrapper, ARIA |
| Privacy Policy | `PrivacyPolicy.tsx` | No | No | No | Needs PageWrapper, ARIA |
| Terms of Service | `TermsOfService.tsx` | No | No | No | Needs PageWrapper, ARIA |
| Accessibility Statement | `AccessibilityPage.tsx` | No | No | No | Needs PageWrapper, ARIA |

---

## Priority 9: Settings Pages

| Page | File | Has Modal | Has Form | Has Table | Status |
|------|------|-----------|----------|-----------|--------|
| User Settings | `UserSettings.tsx` | No | No | No | Needs PageWrapper, ARIA |
| Company Admin Settings | `CompanyAdminSettings.tsx` | No | No | No | Needs PageWrapper, ARIA |
| Subscription Settings | `SubscriptionSettings.tsx` | No | No | No | Needs PageWrapper, ARIA |
| Integrations | `Integrations.tsx` | No | No | No | Needs PageWrapper, ARIA |
| User Management | `UserManagement.tsx` | No | No | No | Needs PageWrapper, ARIA |
| Employee Management | `EmployeeManagement.tsx` | No | No | No | Needs PageWrapper, ARIA |
| Performance Reviews | `PerformanceReviews.tsx` | No | No | No | Needs PageWrapper, ARIA |
| Backup Restore | `BackupRestore.tsx` | No | No | No | Needs PageWrapper, ARIA |

---

## Priority 10: Hubs & Dashboards

| Page | File | Has Modal | Has Form | Has Table | Status |
|------|------|-----------|----------|-----------|--------|
| Operations Hub | `hubs/OperationsHub.tsx` | No | No | No | Needs PageWrapper, ARIA |
| People Hub | `hubs/PeopleHub.tsx` | No | No | No | Needs PageWrapper, ARIA |
| Admin Hub | `hubs/AdminHub.tsx` | No | No | No | Needs PageWrapper, ARIA |
| Enterprise Hub | `EnterpriseHub.tsx` | No | No | No | Needs PageWrapper, ARIA |
| Mobile Dashboard | `MobileDashboard.tsx` | No | No | No | Needs PageWrapper, ARIA |

---

## Priority 11: Tools & Calculators

| Page | File | Has Modal | Has Form | Has Table | Status |
|------|------|-----------|----------|-----------|--------|
| Tools | `Tools.tsx` | No | No | No | Needs PageWrapper, ARIA |
| ROI Calculator | `ROICalculator.tsx` | No | No | No | Needs PageWrapper, ARIA |
| Profitability Calculator | `ProfitabilityCalculator.tsx` | Yes | Yes | No | Needs all accessible components |
| Schedule Builder | `tools/ScheduleBuilder.tsx` | Yes | No | No | Needs AccessibleModal |
| Calendar Sync | `CalendarSync.tsx` | No | No | No | Needs PageWrapper, ARIA |

---

## Priority 12: Comparison & Resource Pages

These are mostly static content pages.

| Page | File | Status |
|------|------|--------|
| Procore Alternative | `ProcoreAlternative.tsx` | Needs PageWrapper, ARIA |
| Buildertrend Alternative | `BuildertrendAlternative.tsx` | Needs PageWrapper, ARIA |
| BuildDesk vs Procore | `BuildDeskVsProcore.tsx` | Needs PageWrapper, ARIA |
| BuildDesk vs CoConstruct | `BuildDeskVsCoConstruct.tsx` | Needs PageWrapper, ARIA |
| BuildDesk vs Buildertrend | `BuildDeskVsBuildertrend.tsx` | Needs PageWrapper, ARIA |
| Resources | `Resources.tsx` | Needs PageWrapper, ARIA |
| All `resources/*.tsx` pages | 10+ pages | Needs PageWrapper, ARIA |
| All `topics/*.tsx` pages | 2+ pages | Needs PageWrapper, ARIA |
| All `features/*.tsx` pages | 10+ pages | Needs PageWrapper, ARIA |

---

## Remediation Approach

### For Each Page:

1. **Wrap with AccessiblePageWrapper**
   ```tsx
   import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';

   return (
     <AccessiblePageWrapper title="Page Title">
       {/* page content */}
     </AccessiblePageWrapper>
   );
   ```

2. **Replace Dialog/Sheet with AccessibleModal**
   ```tsx
   import { AccessibleModal } from '@/components/accessibility/AccessibleModal';

   <AccessibleModal
     isOpen={open}
     onClose={() => setOpen(false)}
     title="Modal Title"
     description="Optional description"
   >
     {/* modal content */}
   </AccessibleModal>
   ```

3. **Replace forms with AccessibleForm components**
   ```tsx
   import {
     AccessibleForm,
     AccessibleFormField,
     AccessibleSelect,
     AccessibleTextarea
   } from '@/components/accessibility/AccessibleForm';

   <AccessibleForm onSubmit={handleSubmit} ariaLabel="Form description">
     <AccessibleFormField name="field" label="Field Label" required />
     <AccessibleSelect name="select" label="Select" options={options} />
   </AccessibleForm>
   ```

4. **Replace Table with AccessibleTable**
   ```tsx
   import { AccessibleTable } from '@/components/accessibility/AccessibleTable';

   <AccessibleTable
     caption="Table description"
     headers={headers}
     data={data}
     sortable
   />
   ```

5. **Add ARIA attributes to interactive elements**
   ```tsx
   // Icons should be decorative
   <Icon aria-hidden="true" />

   // Badges should describe their meaning
   <Badge aria-label={`Status: ${status}`}>{status}</Badge>

   // Search areas should be labeled
   <div role="search" aria-label="Search items">
   ```

---

## Testing Checklist

For each remediated page:

- [ ] Run axe-core: `await expectNoA11yViolations(container)`
- [ ] Test keyboard navigation (Tab, Enter, Escape)
- [ ] Test with screen reader (NVDA or VoiceOver)
- [ ] Verify focus trap in modals
- [ ] Check color contrast (4.5:1 minimum)
- [ ] Verify heading hierarchy (no skipped levels)
- [ ] Test at 200% zoom
- [ ] Test reduced motion preference

---

## Tracking Progress

| Priority | Total Pages | Compliant | % Complete |
|----------|-------------|-----------|------------|
| P1: Critical Path | 10 | 10 | 100% |
| P2: Financial | 15 | 9 | 60% |
| P3: CRM | 10 | 0 | 0% |
| P4: Admin | 12 | 0 | 0% |
| P5: Operations | 17 | 0 | 0% |
| P6: Compliance | 8 | 0 | 0% |
| P7: Vendors | 3 | 0 | 0% |
| P8: Marketing | 15 | 0 | 0% |
| P9: Settings | 8 | 0 | 0% |
| P10: Hubs | 5 | 0 | 0% |
| P11: Tools | 5 | 0 | 0% |
| P12: Resources | 20+ | 0 | 0% |
| **TOTAL** | **125+** | **19** | **~15%** |

### Recently Updated (February 2026)
- `Auth.tsx` - Added semantic HTML, ARIA labels on forms/tabs, aria-hidden on icons
- `Projects.tsx` - Added role="article" on cards, aria-labelledby, search region labels
- `CreateProject.tsx` - Added form aria-label, aria-required, aria-pressed on toggles
- `Timesheets.tsx` - Added main landmark, table scope attributes, stat card labels
- `Dashboard.tsx` - Added section/aside landmarks with aria-labels
- `MyTasks.tsx` - Full AccessibleModal/AccessibleForm implementation (reference)
- `Setup.tsx` - Added landmarks, form ARIA, aria-describedby
- `DailyReports.tsx` - Added Dialog ARIA, fieldset for photos, role="article" on cards
- `ResetPassword.tsx` - Added landmarks, form ARIA, autoComplete attributes
- `ProjectDetail.tsx` - Added landmarks, Sheet ARIA, button aria-labels
- `FinanceHub.tsx` - Added landmarks, tabs aria-label, keyboard-navigable cards
- `ChartOfAccounts.tsx` - Added Dialog ARIA, form accessibility, table scope
- `JournalEntries.tsx` - Added fieldset for lines, delete button aria-labels
- `BillPayments.tsx` - Added metrics section, table accessibility
- `AccountsPayable.tsx` - Added sections, filter with role="search", table ARIA
- `BalanceSheet.tsx` - Added toolbar role, section landmarks, alert roles
- `ProfitAndLoss.tsx` - Added landmarks, table scope, metrics section ARIA
- `GeneralLedger.tsx` - Added landmarks, filters section, table accessibility
- `TrialBalance.tsx` - Added landmarks, balance status roles, table ARIA

---

## Recommended Sprint Plan

### Sprint 1: Critical Path (Week 1)
- Auth.tsx, Setup.tsx, ResetPassword.tsx
- Dashboard.tsx, Projects.tsx, CreateProject.tsx
- Goal: All login and core navigation accessible

### Sprint 2: Financial Core (Week 2)
- FinanceHub.tsx, ChartOfAccounts.tsx, JournalEntries.tsx
- BillPayments.tsx, AccountsPayable.tsx
- Goal: Financial data entry accessible

### Sprint 3: Financial Reports (Week 3)
- BalanceSheet.tsx, ProfitAndLoss.tsx, CashFlowStatement.tsx
- GeneralLedger.tsx, TrialBalance.tsx
- Goal: Financial reports accessible

### Sprint 4: CRM (Week 4)
- CRMDashboard.tsx, CRMLeads.tsx, CRMContacts.tsx
- CRMOpportunities.tsx
- Goal: Sales workflow accessible

### Sprint 5: Operations (Week 5-6)
- TeamManagement.tsx, CrewScheduling.tsx
- Equipment pages, Material pages, Safety pages
- Goal: Field operations accessible

### Sprint 6: Admin & Settings (Week 7)
- All admin/ pages
- Settings pages
- Goal: Administration accessible

### Sprint 7: Marketing & Public (Week 8)
- Landing.tsx, Features.tsx, Pricing.tsx
- Blog pages, comparison pages
- Goal: Public-facing pages accessible

---

*This checklist should be updated as pages are remediated.*
