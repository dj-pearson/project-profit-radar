# Rollback Scripts

This directory contains scripts to revert BuildDesk from multi-tenant to single-tenant architecture.

## Available Scripts

### `execute-rollback.sh`
**Interactive rollback execution script**

- Pre-flight safety checks
- Database backup verification
- Git checkpoint creation
- Automated frontend cleanup
- Guided manual steps
- Build testing
- Summary and next steps

**Usage:**
```bash
bash scripts/execute-rollback.sh
```

### `rollback-multi-tenant-frontend.js`
**Frontend code cleanup script**

- Removes multi-tenant files
- Scans for site_id references
- Generates cleanup reports
- Creates frontend checklist

**Usage:**
```bash
node scripts/rollback-multi-tenant-frontend.js
```

**Outputs:**
- `SITE_ID_CLEANUP_REPORT.txt` - All site_id references
- `FRONTEND_ROLLBACK_CHECKLIST.md` - Manual cleanup steps

## Quick Start

```bash
# Run the automated rollback
bash scripts/execute-rollback.sh
```

## Documentation

See `START_HERE_ROLLBACK.md` in the root directory for complete instructions.

