# Supabase Migration Audit Report

**Date:** December 20, 2025
**Purpose:** Comprehensive audit of codebase to ensure proper migration from cloud Supabase to self-hosted infrastructure

## Executive Summary

This audit identifies all remaining references to the old cloud-based Supabase instance (`ilhzuvemiuyfuxfegtlv.supabase.co`) and documents hardcoded/mock data that needs to be replaced with real database functionality.

---

## 1. Configuration Status

### Properly Configured (No Changes Needed)

| File | Status | Notes |
|------|--------|-------|
| `wrangler.toml` | GOOD | Correctly points to `api.build-desk.com` and `functions.build-desk.com` |
| `src/integrations/supabase/client.ts` | GOOD | Uses environment variables, has proper self-hosted detection |
| `supabase/functions/_shared/auth-helpers.ts` | GOOD | Uses `Deno.env.get('SUPABASE_URL')` |

### Needs Update

| File | Issue | Priority |
|------|-------|----------|
| `supabase/config.toml` | `project_id = "ilhzuvemiuyfuxfegtlv"` - old cloud project ID | HIGH |
| `package.json` | MCP script has hardcoded old project ID | MEDIUM |

---

## 2. Source Code with Old Supabase URLs

### Critical - Storage/CDN URLs (Need Migration)

These files have hardcoded references to the old Supabase storage. **Assets need to be migrated to the self-hosted storage.**

| File | Line | Issue |
|------|------|-------|
| `src/components/seo/UnifiedSEOSystem.tsx` | 49, 164 | Hardcoded logo URL to old storage |
| `src/components/seo/PageSEO.tsx` | 50 | Hardcoded OG image URL |
| `src/components/SEOMetaTags.tsx` | 50 | Hardcoded organization logo URL |
| `src/components/ui/smart-logo.tsx` | 59, 235 | Default logo fallback URLs |
| `src/components/ui/responsive-logo.tsx` | 78, 241, 250 | Default logo fallback URLs |

**Action Required:**
1. Upload assets to new self-hosted storage (`storage.build-desk.com` or similar)
2. Update all references to use environment variable or config-based URL

### Edge Functions

| File | Line | Issue |
|------|------|-------|
| `supabase/functions/generate-scaling-plan/index.ts` | 41-42 | Hardcoded Supabase URL and anon key |

**Fix Required:**
```typescript
// Replace:
const supabaseClient = createClient(
  'https://ilhzuvemiuyfuxfegtlv.supabase.co',
  'eyJhbGciOiJIUzI1NiIs...',

// With:
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
```

---

## 3. Hardcoded Mock/Sample Data

### Critical - Pages Using Mock Data Instead of Database

| File | Component | Issue | Priority |
|------|-----------|-------|----------|
| `src/pages/Equipment.tsx` | Equipment list | Lines 30-73: Hardcoded equipment array | HIGH |
| `src/pages/Equipment.tsx` | Maintenance records | Lines 75-96: Hardcoded maintenance data | HIGH |
| `src/pages/MobileShowcase.tsx` | Demo projects | Lines 54-58: Sample project data | MEDIUM |
| `src/pages/EquipmentManagement.tsx` | Equipment data | Line 18 comment: "Mock equipment data" | HIGH |

### Critical - Financial Components Using Mock Data

| File | Component | Issue | Priority |
|------|-----------|-------|----------|
| `src/components/financial/CashFlowRunwayWidget.tsx` | Cash flow data | Lines 71-125: All mock data | HIGH |
| `src/components/payments/PaymentDashboard.tsx` | Payment stats | Line 45 comment: "Mock payment statistics" | HIGH |
| `src/components/payments/PaymentMethodManager.tsx` | Payment methods | Line 49 comment: "Mock data for demonstration" | HIGH |

### Services Using Mock Implementations

| File | Service | Issue | Priority |
|------|---------|-------|----------|
| `src/services/MockServices.ts` | ConstructionFlowEngine, MaterialOrchestrationService | Entire file is mock stubs | HIGH |
| `src/services/ConstructionFlowEngine.ts` | Flow engine | Comment: "Mock replacement" | HIGH |
| `src/services/MaterialOrchestrationService.ts` | Material service | Comment: "Mock replacement" | HIGH |
| `src/services/TradeHandoffService.ts` | Trade handoff | Comment: "Mock Trade Handoff Service" | HIGH |
| `src/services/SmartClientUpdatesService.ts` | Client updates | Comment: "Mock Smart Client Updates Service" | HIGH |
| `src/services/AIQualityControlService.ts` | Quality control | Comment: "Mock AI Quality Control Service" | HIGH |
| `src/services/FinancialIntelligenceService.ts` | Financial analysis | Multiple "Mock" comments (lines 127, 183, 228, 286, 340) | HIGH |
| `src/services/SecurityService.ts` | Security features | Multiple "Mock" comments (lines 69, 103, 148, 173, 202) | MEDIUM |
| `src/services/ComplianceAutomationService.ts` | Compliance | Multiple "Mock" comments (lines 97, 142, 188, 216) | MEDIUM |
| `src/services/CashFlowOptimizationService.ts` | Cash flow | Multiple "Mock" comments (lines 68, 98, 126, 167, 205, 228, 266, 291, 314) | HIGH |
| `src/services/IntegrationService.ts` | Integrations | Multiple "Mock" comments (lines 45, 142, 174, 201, 228) | MEDIUM |
| `src/services/AdvancedMobileService.ts` | Mobile features | Mock voice and photo processing (lines 67, 123) | LOW |
| `src/services/IntegrationEcosystemService.ts` | Integration sync | Line 213: Mock sync process | MEDIUM |
| `src/services/WorkflowAutomationService.ts` | Workflows | Mock workflow execution (lines 141, 154, 164) | MEDIUM |

### Analytics/Reporting Mock Data

| File | Issue | Priority |
|------|-------|----------|
| `src/services/analytics/analyticsEngine.ts` | Line 440: Mock productivity and task metrics | MEDIUM |
| `src/components/dashboard/widgets/MetricsWidget.tsx` | Line 49: TODO for period comparison | LOW |

### Demo/Example Data in Components

| File | Issue | Priority |
|------|-------|----------|
| `src/components/field/FieldReportingSystem.tsx` | Line 78: Mock data for demonstration | MEDIUM |
| `src/components/documents/DocumentManagementSystem.tsx` | Line 43: Mock data for demonstration | MEDIUM |
| `src/pages/SafetyManagement.tsx` | Line 33 comment: "Mock data" | MEDIUM |
| `src/pages/ComponentShowcase.tsx` | Line 39: Sample gallery images | LOW |
| `src/components/offline/OfflineManager.tsx` | Line 25: Mock additional features | LOW |

---

## 4. TODO/FIXME Items Requiring Attention

| File | Line | TODO |
|------|------|------|
| `src/hooks/useAdvancedChat.ts` | 78-79 | Get actual member_count and unread_count |
| `src/hooks/useAdvancedChat.ts` | 127, 344 | Get actual user name |
| `src/config/routeConfig.ts` | 197 | Create client portal dashboard |
| `src/hooks/useFinancialSettings.ts` | 142 | Add subcontractor tracking |
| `src/contexts/SubscriptionContext.tsx` | 213 | Fetch storage usage from usage_metrics table |
| `src/services/ContentSEOGenerator.ts` | 683 | Create generated_content table |
| `src/services/EnterpriseSeOService.ts` | 519 | Create seo_page_configs table |
| `src/hooks/useImpersonation.ts` | 255 | Implement email notification |
| `src/pages/Equipment.tsx` | 266, 277, 330 | Open dialog implementations |
| `src/pages/admin/TenantManagement.tsx` | 101 | Add actual project count |

---

## 5. Documentation Files with Old URLs (Low Priority)

These are documentation files that reference old URLs for historical context or setup guides:

- `MAKE_COM_BLOG_AUTOMATION_SETUP.md`
- `MAKE_COM_SOCIAL_CONTENT_SETUP.md`
- `COMPLETE_AUTOMATION_DEPLOYMENT.md`
- `DEPLOY_BLOG_AUTOMATION.md`
- `EMAIL_SYNC_SETUP_GUIDE.md`
- `FIX_SUMMARY.md`
- `MCP-Integration-Summary.md`
- `SECURITY_AUDIT_REPORT.md`
- `docs/PHASE5_CRON_SETUP.md`
- `docs/PHASE5_EMAIL_INTEGRATION.md`
- `docs/MOBILE_DEPLOYMENT.md`
- Various other `.md` files

**Recommendation:** Update these guides when time permits, but they are not blocking the migration.

---

## 6. Test Files (Expected)

These files contain mock data as part of testing infrastructure (acceptable):

- `src/test/mocks/supabase.ts`
- `src/test/setup.ts`
- `src/test/test-utils.tsx`
- `src/test/fixtures/index.ts`
- `src/contexts/MockAuthContext.tsx`

---

## Action Plan

### Phase 1: Critical Infrastructure (Immediate) ✅ COMPLETE

- [x] **1.1** Update `supabase/functions/generate-scaling-plan/index.ts` to use environment variables
- [x] **1.2** Migrate logo and assets to self-hosted storage (now uses `getAssetUrl()` utility)
- [x] **1.3** Update all hardcoded storage URLs to use config/env variable

### Phase 2: Core Functionality ✅ COMPLETE

- [x] **2.1** Replace mock data in `Equipment.tsx` with real database queries (created `useEquipment` hook)
- [x] **2.2** Replace mock data in `CashFlowRunwayWidget.tsx` with real financial data (created `useCashFlow` hook)
- [x] **2.3** Implement real `PaymentDashboard.tsx` and `PaymentMethodManager.tsx` (created `usePayments` hook)
- [x] **2.4** Update `EquipmentManagement.tsx` to fetch from database (uses `useEquipmentWithMaintenance` hook)

### Phase 3: Services ✅ PARTIAL COMPLETE

- [x] **3.1** `ConstructionFlowEngine` - REMOVED (unused orphan file)
- [x] **3.2** `MaterialOrchestrationService` - REMOVED (unused orphan file)
- [x] **3.3** `MockServices.ts` - REMOVED (unused orphan file)
- [ ] **3.4** Review and implement `FinancialIntelligenceService` methods
- [ ] **3.5** Review and implement `CashFlowOptimizationService` methods

### Phase 4: Secondary Features (Future)

- [ ] **4.1** Implement `SecurityService` real functionality
- [ ] **4.2** Implement `ComplianceAutomationService` real functionality
- [ ] **4.3** Implement `IntegrationService` real functionality

### Phase 5: Polish (Future)

- [ ] **5.1** Address remaining TODO items
- [ ] **5.2** Update documentation with new URLs
- [ ] **5.3** Remove or replace demo/sample data in component showcases

---

## New Hooks Created

The following React Query hooks were created to replace mock data with real database queries:

| Hook File | Hooks Exported | Purpose |
|-----------|----------------|---------|
| `src/hooks/useEquipment.ts` | `useEquipment`, `useEquipmentWithMaintenance`, `useMaintenanceRecords`, `useEquipmentStats`, `useCreateEquipment`, `useUpdateEquipment`, `useDeleteEquipment` | Equipment CRUD operations |
| `src/hooks/useCashFlow.ts` | `useCashFlowData`, `useCashFlowActivity` | Cash flow analytics from invoices/expenses |
| `src/hooks/usePayments.ts` | `usePaymentStats`, `useRecentPayments` | Payment statistics from invoices |

---

## Verification Checklist

After completing the migration, verify:

- [x] No references to `ilhzuvemiuyfuxfegtlv.supabase.co` in source code (except documentation)
- [x] All edge functions use `Deno.env.get('SUPABASE_URL')`
- [x] All assets load from self-hosted storage (via `getAssetUrl()` utility)
- [x] Equipment page shows real data from database
- [x] Financial widgets show real company data (CashFlowRunwayWidget)
- [x] Payment components handle empty/error states gracefully
- [ ] No console errors related to failed API calls (manual verification needed)

---

## Notes

1. **Environment Variables**: The self-hosted setup uses:
   - `VITE_SUPABASE_URL` = `https://api.build-desk.com`
   - `VITE_EDGE_FUNCTIONS_URL` = `https://functions.build-desk.com`

2. **Storage**: Need to set up storage endpoints and migrate assets

3. **Old Project ID**: `ilhzuvemiuyfuxfegtlv` - search for this to find remaining references

---

**Last Updated:** December 20, 2025
