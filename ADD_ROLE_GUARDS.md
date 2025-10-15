# Pages That Need Role Guards Added

## Instructions
For each page below, add the following:

### 1. Import Statement (add to top of file)
```typescript
import { RoleGuard, ROLE_GROUPS } from '@/components/auth/RoleGuard';
```

### 2. Wrap the return statement (wrap the outermost element)
```typescript
return (
  <RoleGuard allowedRoles={ROLE_GROUPS.APPROPRIATE_GROUP}>
    {/* existing JSX */}
  </RoleGuard>
);
```

---

## Project-Specific Pages (Use ROLE_GROUPS.PROJECT_VIEWERS)

- [ ] **JobCosting.tsx** - Financial tracking (also needs FINANCIAL_VIEWERS)
- [ ] **RFIs.tsx** - Request for Information
- [ ] **Submittals.tsx** - Submittal tracking
- [ ] **PunchList.tsx** - Punch list items
- [ ] **DocumentManagement.tsx** - Document management
- [ ] **Materials.tsx** - Materials tracking
- [ ] **MaterialTracking.tsx** - Material tracking
- [ ] **Equipment.tsx** - Equipment management

---

## Financial Pages (Use ROLE_GROUPS.FINANCIAL_VIEWERS)

- [ ] **FinancialDashboard.tsx** - Main financial dashboard
- [ ] **EstimatesHub.tsx** - Estimates management
- [ ] **PurchaseOrders.tsx** - Purchase orders
- [ ] **Vendors.tsx** - Vendor management
- [ ] **Reports.tsx** - Financial reports

---

## People/Team Pages (Use ROLE_GROUPS.TEAM_MANAGERS)

- [ ] **TeamManagement.tsx** - Team member management
- [ ] **CrewScheduling.tsx** - Crew scheduling

---

## Admin Pages (Use ROLE_GROUPS.ADMINS)

- [ ] **CompanySettings.tsx** - Company configuration
- [ ] **SecuritySettings.tsx** - Security settings
- [ ] **SystemAdminSettings.tsx** - System admin (Use ROLE_GROUPS.ROOT_ADMIN)
- [ ] **Companies.tsx** (admin folder) - (Use ROLE_GROUPS.ROOT_ADMIN)
- [ ] **Users.tsx** (admin folder) - User management
- [ ] **Billing.tsx** (admin folder) - Billing management
- [ ] **Promotions.tsx** (admin folder) - Promotions
- [ ] **Analytics.tsx** - Analytics dashboard
- [ ] **Settings.tsx** (admin folder) - Admin settings

---

## COMPLETED ✅
- [x] **ScheduleManagement.tsx** - Added ROLE_GROUPS.PROJECT_VIEWERS
- [x] **ProjectDetail.tsx** - Has inline role check
- [x] **ProjectTaskCreate.tsx** - Has company_id validation
- [x] **Projects.tsx** - Properly filtered
- [x] **DailyReports.tsx** - Has inline role check
- [x] **ChangeOrders.tsx** - Has inline role check
