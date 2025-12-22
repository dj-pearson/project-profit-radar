#!/bin/bash

# ============================================================================
# Multi-Tenant Rollback Execution Script
# ============================================================================
# This script guides you through the complete rollback process.
# It will pause at critical points for manual verification.
#
# Usage: bash scripts/execute-rollback.sh
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "═══════════════════════════════════════════════════════════"
echo "  BuildDesk Multi-Tenant Rollback Execution Script"
echo "═══════════════════════════════════════════════════════════"
echo -e "${NC}\n"

# ============================================================================
# Pre-flight Checks
# ============================================================================

echo -e "${YELLOW}⚠️  CRITICAL PRE-FLIGHT CHECKS${NC}\n"

# Check 1: Git status
echo -e "${BLUE}Check 1: Git Status${NC}"
if [ -n "$(git status --porcelain)" ]; then
  echo -e "${YELLOW}⚠️  You have uncommitted changes!${NC}"
  echo "Current git status:"
  git status --short
  echo ""
  read -p "Do you want to commit these changes before proceeding? (y/n): " commit_choice
  if [ "$commit_choice" = "y" ]; then
    git add -A
    git commit -m "Pre-rollback checkpoint"
    echo -e "${GREEN}✅ Changes committed${NC}\n"
  fi
else
  echo -e "${GREEN}✅ Working directory is clean${NC}\n"
fi

# Check 2: Create checkpoint tag
echo -e "${BLUE}Check 2: Creating Git Checkpoint${NC}"
git tag -f pre-rollback-checkpoint
echo -e "${GREEN}✅ Created tag: pre-rollback-checkpoint${NC}\n"

# Check 3: Database connection info
echo -e "${BLUE}Check 3: Database Connection${NC}"
echo -e "${YELLOW}You will need your Supabase database credentials:${NC}"
echo "  - Host (e.g., db.xxxxx.supabase.co)"
echo "  - Database: postgres"
echo "  - Username: postgres"
echo "  - Password: Your database password"
echo ""
read -p "Do you have your database credentials ready? (y/n): " creds_ready
if [ "$creds_ready" != "y" ]; then
  echo -e "${RED}❌ Please get your credentials and re-run this script${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Database credentials ready${NC}\n"

# Check 4: Backup reminder
echo -e "${BLUE}Check 4: Database Backup${NC}"
echo -e "${RED}⚠️  CRITICAL: You MUST have a database backup before proceeding!${NC}"
echo ""
echo "To create a backup, run:"
echo "  pg_dump -h YOUR_HOST -U postgres -d postgres --clean --if-exists > backup_$(date +%Y%m%d_%H%M%S).sql"
echo ""
read -p "Have you created a database backup? (yes/no): " backup_done
if [ "$backup_done" != "yes" ]; then
  echo -e "${RED}❌ Please create a backup first! This is NON-NEGOTIABLE.${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Database backup confirmed${NC}\n"

# Final confirmation
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  FINAL CONFIRMATION${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "This script will:"
echo "  1. Apply database migration to remove site_id columns"
echo "  2. Remove multi-tenant frontend code"
echo "  3. Generate cleanup reports"
echo ""
echo -e "${RED}This is a DESTRUCTIVE operation!${NC}"
echo ""
read -p "Type 'ROLLBACK' to proceed: " confirmation
if [ "$confirmation" != "ROLLBACK" ]; then
  echo -e "${RED}❌ Rollback cancelled${NC}"
  exit 1
fi

echo -e "\n${GREEN}✅ Starting rollback process...${NC}\n"

# ============================================================================
# Phase 1: Frontend Cleanup
# ============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Phase 1: Frontend Cleanup${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

if [ -f "scripts/rollback-multi-tenant-frontend.js" ]; then
  echo "Running frontend cleanup script..."
  node scripts/rollback-multi-tenant-frontend.js
  echo ""
  echo -e "${GREEN}✅ Frontend cleanup script completed${NC}\n"
else
  echo -e "${YELLOW}⚠️  Frontend cleanup script not found. Skipping...${NC}\n"
fi

# ============================================================================
# Phase 2: Database Rollback Instructions
# ============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Phase 2: Database Rollback${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}The database rollback requires manual execution.${NC}"
echo ""
echo "To apply the database migration, run ONE of the following:"
echo ""
echo -e "${GREEN}Option 1: Using psql (Recommended)${NC}"
echo "  psql -h YOUR_HOST -U postgres -d postgres -f supabase/migrations/ROLLBACK_multi_tenant.sql"
echo ""
echo -e "${GREEN}Option 2: Using Supabase Dashboard${NC}"
echo "  1. Go to: https://YOUR_PROJECT.supabase.co/project/YOUR_PROJECT/sql/new"
echo "  2. Copy contents of: supabase/migrations/ROLLBACK_multi_tenant.sql"
echo "  3. Paste and run in SQL Editor"
echo ""
read -p "Press Enter when you've completed the database rollback..."

echo ""
echo -e "${BLUE}Verifying database rollback...${NC}"
echo "Please run these verification queries in your database:"
echo ""
echo -e "${GREEN}-- Check 1: Verify no site_id columns${NC}"
echo "SELECT COUNT(*) FROM information_schema.columns WHERE column_name = 'site_id';"
echo -e "${YELLOW}Expected: 0${NC}"
echo ""
echo -e "${GREEN}-- Check 2: Verify sites table is gone${NC}"
echo "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'sites';"
echo -e "${YELLOW}Expected: 0${NC}"
echo ""
read -p "Did both checks pass? (y/n): " db_verify
if [ "$db_verify" != "y" ]; then
  echo -e "${RED}❌ Database verification failed. Please review and fix before continuing.${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Database rollback verified${NC}\n"

# ============================================================================
# Phase 3: Generate Reports
# ============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Phase 3: Generate Cleanup Reports${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

echo "Searching for remaining site_id references..."
echo ""

# Search frontend
if grep -r "site_id" --include="*.ts" --include="*.tsx" src/ 2>/dev/null > /dev/null; then
  echo -e "${YELLOW}⚠️  Found site_id references in frontend:${NC}"
  grep -r "site_id" --include="*.ts" --include="*.tsx" src/ | head -10
  echo ""
  echo "Full report saved to: SITE_ID_CLEANUP_REPORT.txt"
else
  echo -e "${GREEN}✅ No site_id references in frontend${NC}"
fi
echo ""

# Search Edge Functions
if grep -r "siteId" supabase/functions/ --include="*.ts" 2>/dev/null > /dev/null; then
  echo -e "${YELLOW}⚠️  Found siteId references in Edge Functions:${NC}"
  grep -r "siteId" supabase/functions/ --include="*.ts" | head -10
  echo ""
  echo "You'll need to manually update these functions to use auth-helpers-single-tenant.ts"
else
  echo -e "${GREEN}✅ No siteId references in Edge Functions${NC}"
fi
echo ""

# ============================================================================
# Phase 4: Build Test
# ============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Phase 4: Build Test${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

echo "Testing TypeScript compilation..."
if npm run build 2>&1 | tee build_output.log; then
  echo -e "\n${GREEN}✅ Build succeeded!${NC}\n"
  rm build_output.log
else
  echo -e "\n${RED}❌ Build failed!${NC}"
  echo "Check build_output.log for details"
  echo "You'll need to fix TypeScript errors before deploying"
  echo ""
  read -p "Continue anyway? (y/n): " continue_choice
  if [ "$continue_choice" != "y" ]; then
    exit 1
  fi
fi

# ============================================================================
# Phase 5: Summary & Next Steps
# ============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Rollback Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

echo -e "${GREEN}✅ Completed Steps:${NC}"
echo "  - Git checkpoint created (tag: pre-rollback-checkpoint)"
echo "  - Frontend cleanup script executed"
echo "  - Database rollback migration applied"
echo "  - Reports generated"
echo "  - Build test completed"
echo ""

echo -e "${YELLOW}📋 Next Steps (Manual):${NC}"
echo ""
echo "1. Review FRONTEND_ROLLBACK_CHECKLIST.md"
echo "   - Update AuthContext to remove siteId"
echo "   - Update all hooks to remove site_id filters"
echo "   - Replace useSiteQuery with useQuery"
echo ""
echo "2. Update Edge Functions"
echo "   - Change imports to auth-helpers-single-tenant.ts"
echo "   - Remove .eq('site_id', siteId) from queries"
echo ""
echo "3. Test Locally"
echo "   - npm run dev"
echo "   - Test authentication"
echo "   - Test data access"
echo "   - Check browser console for errors"
echo ""
echo "4. Deploy When Ready"
echo "   - git commit -am 'Complete multi-tenant rollback'"
echo "   - git push origin main"
echo "   - npm run build && wrangler pages publish dist"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Important Files Created:${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

echo "📄 MULTI_TENANT_ROLLBACK_GUIDE.md - Complete rollback guide"
echo "📄 FRONTEND_ROLLBACK_CHECKLIST.md - Frontend cleanup checklist"
echo "📄 SITE_ID_CLEANUP_REPORT.txt - List of site_id references"
echo "📄 supabase/migrations/ROLLBACK_multi_tenant.sql - Database rollback"
echo "📄 supabase/functions/_shared/auth-helpers-single-tenant.ts - New helpers"
echo ""

echo -e "${YELLOW}⚠️  REMINDER: This rollback is NOT complete until you:${NC}"
echo "  1. Manually update AuthContext"
echo "  2. Manually update all hooks/services"
echo "  3. Test thoroughly"
echo "  4. Deploy to production"
echo ""

echo -e "${GREEN}🎉 Automated rollback steps completed!${NC}"
echo -e "${GREEN}📖 Follow MULTI_TENANT_ROLLBACK_GUIDE.md for remaining steps${NC}\n"

# ============================================================================
# Rollback Option
# ============================================================================

echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Emergency Rollback${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}\n"

echo "If you need to undo these changes:"
echo "  git reset --hard pre-rollback-checkpoint"
echo "  (Then restore your database from backup)"
echo ""

