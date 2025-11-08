# Performance Optimization Guide

This document provides step-by-step instructions for implementing the performance fixes identified in the comprehensive audit.

## Quick Wins (5-10 minutes) - Immediate Impact

### 1. Apply Database Migrations

The following migrations have been created and are ready to apply:

```bash
# Apply migrations (run in order)
npx supabase db push
```

Files created:
- `supabase/migrations/20250208000001_add_missing_indexes.sql` - Adds 15+ critical indexes
- `supabase/migrations/20250208000002_optimize_rls_policies.sql` - Optimizes RLS policies
- `supabase/migrations/20250208000003_add_aggregation_functions.sql` - Database aggregation functions

**Impact:** 90-95% faster join queries, 93% faster dashboard queries with RLS

### 2. Update package.json - Move Expo to devDependencies

**File:** `package.json`

Move these packages from `dependencies` to `devDependencies`:

```json
{
  "devDependencies": {
    "expo": "^52.0.27",
    "expo-application": "~6.0.1",
    "expo-av": "~15.0.1",
    "expo-blur": "~14.0.1",
    "expo-camera": "~16.0.10",
    "expo-constants": "~17.0.3",
    "expo-device": "~7.0.1",
    "expo-file-system": "~18.0.7",
    "expo-font": "~13.0.1",
    "expo-image-picker": "~16.0.5",
    "expo-location": "~18.0.4",
    "expo-network": "~7.0.0",
    "expo-notifications": "~0.29.11",
    "expo-secure-store": "~14.0.0",
    "expo-sensors": "~14.0.3",
    "expo-sharing": "~13.0.2",
    "expo-splash-screen": "~0.29.17",
    "expo-status-bar": "~2.0.0"
  }
}
```

Then run:
```bash
npm install
```

**Impact:** ~2MB reduction in web production bundle

### 3. Enable Console Log Stripping

**File:** `vite.config.ts` (already updated)

The vite config has been updated to strip console logs in production builds.

```bash
npm run build:prod
```

**Impact:** ~50KB reduction + cleaner production logs

---

## Code Optimizations (30-60 minutes each)

### 4. Lazy Load Tesseract.js OCR

**File:** `src/components/ocr/DocumentOCRProcessor.tsx`

**Current (Line 12):**
```typescript
import Tesseract from 'tesseract.js';
```

**Replace with:**
```typescript
// Remove import at top

// In processDocument function:
const processDocument = async (imageFile: File) => {
  setProcessing(true);
  try {
    // Lazy load Tesseract only when needed
    const Tesseract = await import('tesseract.js');
    const worker = await Tesseract.createWorker();

    await worker.loadLanguage('eng');
    await worker.initialize('eng');

    const { data: { text } } = await worker.recognize(imageFile);
    await worker.terminate();

    return text;
  } catch (error) {
    console.error('OCR processing failed:', error);
    throw error;
  } finally {
    setProcessing(false);
  }
};
```

**Impact:** 700KB removed from initial bundle

### 5. Lazy Load Export Libraries

**File:** `src/pages/Reports.tsx` and `src/utils/pdfExportUtils.ts`

**Current (Lines 17-19):**
```typescript
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
```

**Replace with:**
```typescript
// Remove imports at top

// In handleExportPDF:
const handleExportPDF = async (data: any) => {
  try {
    const { default: jsPDF } = await import('jspdf');
    const pdf = new jsPDF();
    // ... rest of PDF generation code
    pdf.save('report.pdf');
  } catch (error) {
    console.error('PDF export failed:', error);
  }
};

// In handleExportExcel:
const handleExportExcel = async (data: any) => {
  try {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, 'report.xlsx');
  } catch (error) {
    console.error('Excel export failed:', error);
  }
};
```

**Impact:** 700KB removed from initial bundle

### 6. Optimize Task Service Query

**File:** `src/services/taskService.ts`

**Current (Lines 71-140):**
```typescript
const { data: tasks } = await supabase.from('tasks').select('*')
  .eq('company_id', companyId);

const projectIds = Array.from(new Set(tasks.map(t => t.project_id)));
const [projectsRes, profilesRes] = await Promise.all([
  supabase.from('projects').select('id, name').in('id', projectIds),
  supabase.from('user_profiles').select('*').in('id', userIds)
]);
```

**Replace with:**
```typescript
const { data: tasks } = await supabase
  .from('tasks')
  .select(`
    id, name, description, status, priority, due_date, assigned_to, created_by,
    start_date, end_date, estimated_hours, actual_hours,
    project:projects!inner(id, name, status),
    assigned_to_profile:user_profiles!assigned_to(
      id, first_name, last_name, email, avatar_url
    ),
    created_by_profile:user_profiles!created_by(
      id, first_name, last_name
    )
  `)
  .eq('company_id', companyId)
  .order('created_at', { ascending: false });
```

**Impact:** 3 queries → 1 query, 70% faster

### 7. Optimize Project Service with Aggregation Function

**File:** `src/services/projectService.ts`

**Current (Line 167):**
```typescript
let query = supabase.from('projects').select('*');
const projects = await query;

// Client-side aggregation
const stats = {
  totalProjects: projects.length,
  activeProjects: projects.filter(p => p.status === 'active').length,
  totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
};
```

**Replace with:**
```typescript
// Use database aggregation function
const { data: stats } = await supabase.rpc('get_project_stats', {
  company_id: companyId
});

// If you still need the project list:
const { data: projects } = await supabase
  .from('projects')
  .select('id, name, status, client_name, budget, completion_percentage, start_date, end_date')
  .eq('company_id', companyId)
  .order('created_at', { ascending: false });
```

**Impact:** 77% faster, 90% less data transfer

### 8. Optimize Mobile Offline Sync

**File:** `src/components/mobile/OfflineDataManager.tsx`

**Current:**
```typescript
const projects = await supabase.from('projects').select('*');
const timeEntries = await supabase.from('time_entries').select('*');
const expenses = await supabase.from('expenses').select('*');
```

**Replace with:**
```typescript
const oneMonthAgo = new Date();
oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

// Only active projects with essential columns
const projects = await supabase
  .from('projects')
  .select('id, name, status, client_name, budget, completion_percentage')
  .eq('company_id', companyId)
  .eq('status', 'active');

// Only recent time entries
const timeEntries = await supabase
  .from('time_entries')
  .select('id, project_id, user_id, date, hours, notes, status')
  .eq('company_id', companyId)
  .gte('date', oneMonthAgo.toISOString());

// Only recent expenses
const expenses = await supabase
  .from('expenses')
  .select('id, project_id, amount, category, date, receipt_url, status')
  .eq('company_id', companyId)
  .gte('date', oneMonthAgo.toISOString());
```

**Impact:** 90% reduction in mobile sync data (12MB → 1.2MB)

---

## Longer-term Optimizations (2-8 hours)

### 9. Replace SELECT * Across Codebase (8 hours)

**Search and replace pattern:**

```bash
# Find all instances
grep -r "\.select\('\*'\)" src/

# Common replacements:
.select('*') → .select('id, name, status, created_at, updated_at')
```

**High-priority files:**
- `src/components/mobile/OfflineDataManager.tsx`
- `src/components/reports/CustomReportBuilder.tsx`
- `src/components/financial/BudgetVsActualTracking.tsx`
- `src/components/compliance/OSHACompliance.tsx`

**Impact:** 60% reduction in network bandwidth

### 10. Add API Caching Headers (2 hours)

**File:** `supabase/functions/_shared/cors.ts`

**Add cache headers based on function type:**

```typescript
// For read-only operations (reports, analytics):
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'public, max-age=300', // 5 minutes
};

// For frequently accessed static data (sitemap, SEO):
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'public, max-age=3600', // 1 hour
};

// For user-specific data (dashboard):
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'private, max-age=60', // 1 minute
};
```

Apply to all edge functions in `supabase/functions/`

**Impact:** Reduces API calls by 40-60%

### 11. Convert Images to WebP/AVIF (1 hour)

**Public images to convert:**
- `public/BuildDeskLogo.png` → `BuildDeskLogo.webp`, `BuildDeskLogo.avif`
- `public/android-chrome-512x512.png` → webp, avif versions
- `public/android-chrome-192x192.png` → webp, avif versions

**Tools:**
```bash
# Using imagemagick or online converter
convert BuildDeskLogo.png -quality 80 BuildDeskLogo.webp
convert BuildDeskLogo.png -quality 80 BuildDeskLogo.avif
```

**Update usage:**
```html
<picture>
  <source srcSet="/BuildDeskLogo.avif" type="image/avif" />
  <source srcSet="/BuildDeskLogo.webp" type="image/webp" />
  <img src="/BuildDeskLogo.png" alt="BuildDesk Logo" width={200} height={200} />
</picture>
```

**Impact:** 60-70% smaller image files

---

## Testing After Implementation

### Performance Benchmarks to Monitor

1. **Bundle Size:**
   ```bash
   npm run build:prod
   # Check dist/ folder size
   du -sh dist/
   ```
   - Before: ~5.2MB
   - Target: <1MB

2. **Lighthouse Score:**
   - Run Lighthouse in Chrome DevTools
   - Target: >90 Performance score

3. **Database Query Performance:**
   ```sql
   -- Check query execution time
   EXPLAIN ANALYZE SELECT * FROM tasks
   JOIN projects ON tasks.project_id = projects.id
   WHERE tasks.company_id = '...';
   ```
   - Before: 2-5 seconds
   - Target: <200ms

4. **API Response Times:**
   - Monitor in Network tab
   - Dashboard load: <1s
   - Reports: <2s

---

## Summary of Expected Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Initial Bundle | 5.2MB | 0.8MB | 85% smaller |
| First Load Time | 5.5s | <2s | 64% faster |
| Dashboard Query | 3.5s | 0.8s | 77% faster |
| Mobile Sync | 12MB | 1.2MB | 90% less data |
| Join Queries | 2-5s | 50-200ms | 90-95% faster |
| Network Bandwidth | Baseline | -60% | 60% savings |

---

## Rollback Plan

If any migration causes issues:

```bash
# Rollback database migrations
npx supabase db reset

# Revert code changes
git revert <commit-hash>
```

Keep monitoring performance metrics for at least 1 week after implementation.

---

## Questions?

Review the full performance audit report for detailed explanations of each issue and additional optimizations.
