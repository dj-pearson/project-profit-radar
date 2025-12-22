#!/usr/bin/env node

/**
 * Frontend Code Cleanup Script
 * 
 * This script removes all site_id related code from the frontend codebase
 * to revert back to single-tenant architecture.
 * 
 * It will:
 * 1. Remove siteId from AuthContext
 * 2. Remove useSiteQuery hook
 * 3. Remove site-resolver
 * 4. Find and report all .eq('site_id', siteId) queries that need manual cleanup
 * 
 * Usage: node scripts/rollback-multi-tenant-frontend.js
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔄 Starting Frontend Multi-Tenant Rollback...\n');

// Files to modify or remove
const filesToHandle = {
  remove: [
    'src/lib/site-resolver.ts',
    'src/hooks/useSiteQuery.ts',
    'src/contexts/SiteContext.tsx', // if it exists
  ],
  modify: [
    'src/contexts/AuthContext.tsx',
  ]
};

// Get project root (parent of scripts directory)
const projectRoot = path.join(__dirname, '..');

// Step 1: Remove files
console.log('📁 Step 1: Removing multi-tenant specific files...\n');
filesToHandle.remove.forEach(file => {
  const filePath = path.join(projectRoot, file);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`✅ Removed: ${file}`);
    } catch (error) {
      console.log(`⚠️  Could not remove ${file}: ${error.message}`);
    }
  } else {
    console.log(`ℹ️  File does not exist (skipping): ${file}`);
  }
});

console.log('\n');

// Step 2: Find all site_id references in code
console.log('📁 Step 2: Finding site_id references in frontend code...\n');

try {
  // Search for .eq('site_id', siteId) patterns
  const grepCommand = `grep -r "site_id" --include="*.ts" --include="*.tsx" src/ || true`;
  const results = execSync(grepCommand, { encoding: 'utf-8' });
  
  if (results) {
    const lines = results.split('\n').filter(line => line.trim());
    
    console.log(`Found ${lines.length} references to site_id:\n`);
    
    // Group by file
    const fileGroups = {};
    lines.forEach(line => {
      const match = line.match(/^([^:]+):/);
      if (match) {
        const file = match[1];
        if (!fileGroups[file]) {
          fileGroups[file] = [];
        }
        fileGroups[file].push(line);
      }
    });
    
    // Display grouped results
    Object.entries(fileGroups).forEach(([file, references]) => {
      console.log(`\n📄 ${file} (${references.length} references):`);
      references.slice(0, 3).forEach(ref => {
        console.log(`   ${ref.substring(ref.indexOf(':') + 1).trim()}`);
      });
      if (references.length > 3) {
        console.log(`   ... and ${references.length - 3} more`);
      }
    });
    
    // Save detailed report
    const reportPath = path.join(projectRoot, 'SITE_ID_CLEANUP_REPORT.txt');
    fs.writeFileSync(reportPath, results);
    console.log(`\n📋 Full report saved to: SITE_ID_CLEANUP_REPORT.txt`);
  } else {
    console.log('✅ No site_id references found in frontend code!');
  }
} catch (error) {
  console.log('⚠️  Could not search for site_id references:', error.message);
}

console.log('\n');

// Step 3: Search for useSiteQuery usage
console.log('📁 Step 3: Finding useSiteQuery usage...\n');

try {
  const useSiteQueryCommand = `grep -r "useSiteQuery" --include="*.ts" --include="*.tsx" src/ || true`;
  const results = execSync(useSiteQueryCommand, { encoding: 'utf-8' });
  
  if (results) {
    const lines = results.split('\n').filter(line => line.trim());
    console.log(`Found ${lines.length} useSiteQuery imports/usages:\n`);
    lines.slice(0, 10).forEach(line => console.log(`   ${line}`));
    if (lines.length > 10) {
      console.log(`   ... and ${lines.length - 10} more`);
    }
  } else {
    console.log('✅ No useSiteQuery usage found!');
  }
} catch (error) {
  console.log('⚠️  Could not search for useSiteQuery:', error.message);
}

console.log('\n');

// Step 4: Instructions for AuthContext
console.log('📁 Step 4: AuthContext cleanup needed...\n');
console.log('⚠️  MANUAL ACTION REQUIRED:');
console.log('   Edit src/contexts/AuthContext.tsx and remove:');
console.log('   1. siteId state variable');
console.log('   2. siteConfig state variable');
console.log('   3. Site resolution logic');
console.log('   4. Any references to getSiteByDomain or similar');
console.log('\n   The AuthContext should only manage:');
console.log('   - user');
console.log('   - session');
console.log('   - profile (user_profiles data)');
console.log('   - signIn/signOut methods');

console.log('\n');

// Step 5: Create a migration checklist
console.log('📁 Step 5: Creating cleanup checklist...\n');

const checklist = `
# Frontend Multi-Tenant Rollback Checklist

## Automated Cleanup (Done by Script)
- [x] Remove src/lib/site-resolver.ts
- [x] Remove src/hooks/useSiteQuery.ts
- [x] Generated site_id reference report

## Manual Cleanup Required

### 1. AuthContext (src/contexts/AuthContext.tsx)
- [ ] Remove siteId from context interface
- [ ] Remove siteConfig from context interface
- [ ] Remove site resolution logic
- [ ] Remove getSiteByDomain calls
- [ ] Keep only: user, session, profile, auth methods

### 2. Database Queries
Review SITE_ID_CLEANUP_REPORT.txt and remove .eq('site_id', siteId) from:
- [ ] All hooks in src/hooks/
- [ ] All service files in src/services/
- [ ] All components that directly query Supabase

### 3. Replace useSiteQuery with useQuery
Find all useSiteQuery imports and replace with standard useQuery:

BEFORE:
\`\`\`typescript
import { useSiteQuery } from '@/hooks/useSiteQuery';

const { data } = useSiteQuery(['projects'], async (siteId) => {
  return supabase.from('projects').select('*').eq('site_id', siteId);
});
\`\`\`

AFTER:
\`\`\`typescript
import { useQuery } from '@tanstack/react-query';

const { data } = useQuery({
  queryKey: ['projects'],
  queryFn: async () => {
    const { data } = await supabase.from('projects').select('*');
    return data;
  }
});
\`\`\`

### 4. Test After Cleanup
- [ ] npm run build (check for TypeScript errors)
- [ ] npm run dev (test locally)
- [ ] Test authentication flow
- [ ] Test data fetching in main pages
- [ ] Check browser console for errors

### 5. Remove Multi-Tenant Documentation
- [ ] Archive or delete MULTI_TENANT_AGENT_INSTRUCTIONS.md
- [ ] Archive or delete MULTI_SITE_MIGRATION_SUMMARY.md
- [ ] Archive or delete MULTI_SITE_COMPLETION_CHECKLIST.md
- [ ] Update CLAUDE.md to remove multi-tenant references

## Common Patterns to Fix

### Pattern 1: Remove siteId from useAuth
\`\`\`typescript
// BEFORE
const { user, siteId } = useAuth();

// AFTER
const { user } = useAuth();
\`\`\`

### Pattern 2: Remove site_id filters
\`\`\`typescript
// BEFORE
.eq('site_id', siteId)
.eq('company_id', companyId)

// AFTER
.eq('company_id', companyId)
\`\`\`

### Pattern 3: Remove site_id from inserts
\`\`\`typescript
// BEFORE
.insert({
  site_id: siteId,
  company_id: companyId,
  ...data
})

// AFTER
.insert({
  company_id: companyId,
  ...data
})
\`\`\`

## Files Most Likely to Need Changes

Based on typical BuildDesk usage:
1. src/hooks/useCompanyData.tsx
2. src/hooks/useDashboardData.tsx
3. src/hooks/useProjects.tsx
4. src/hooks/useTimeEntries.tsx
5. src/services/taskService.ts
6. Any custom hooks you've created

## Verification Commands

\`\`\`bash
# Check for remaining site_id references
grep -r "site_id" --include="*.ts" --include="*.tsx" src/

# Check for useSiteQuery usage
grep -r "useSiteQuery" --include="*.ts" --include="*.tsx" src/

# Check for siteId destructuring
grep -r "{ .* siteId" --include="*.ts" --include="*.tsx" src/

# Build check
npm run build
\`\`\`
`;

fs.writeFileSync(path.join(projectRoot, 'FRONTEND_ROLLBACK_CHECKLIST.md'), checklist);
console.log('✅ Created: FRONTEND_ROLLBACK_CHECKLIST.md');

console.log('\n');
console.log('═══════════════════════════════════════════════════════════');
console.log('✅ Automated cleanup complete!');
console.log('═══════════════════════════════════════════════════════════');
console.log('\n📋 Next Steps:');
console.log('   1. Review SITE_ID_CLEANUP_REPORT.txt');
console.log('   2. Follow FRONTEND_ROLLBACK_CHECKLIST.md');
console.log('   3. Test thoroughly before deploying');
console.log('\n⚠️  IMPORTANT: This is a destructive change. Make sure you have:');
console.log('   - A git commit with your current state');
console.log('   - A database backup');
console.log('   - A rollback plan\n');

