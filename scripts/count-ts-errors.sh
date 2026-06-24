#!/bin/bash
# Count remaining @ts-expect-error comments in the codebase
# Usage: bash scripts/count-ts-errors.sh

echo "=== TypeScript Error Suppression Report ==="
echo ""

# Count @ts-expect-error comments
TS_EXPECT_ERROR_COUNT=$(grep -r "@ts-expect-error" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
echo "Total @ts-expect-error comments: $TS_EXPECT_ERROR_COUNT"

# Count @ts-ignore comments (legacy, should be migrated)
TS_IGNORE_COUNT=$(grep -r "@ts-ignore" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
echo "Total @ts-ignore comments: $TS_IGNORE_COUNT"

# Count by directory
echo ""
echo "=== Breakdown by directory ==="
for dir in src/components src/contexts src/hooks src/lib src/pages src/services src/utils src/types src/integrations src/routes src/mobile src/config; do
  if [ -d "$dir" ]; then
    count=$(grep -r "@ts-expect-error" "$dir" --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
    if [ "$count" -gt 0 ]; then
      echo "  $dir: $count"
    fi
  fi
done

echo ""
echo "=== TODO categories ==="
# Count by TODO category
grep -r "@ts-expect-error" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -o "TODO:[^*]*" | sort | uniq -c | sort -rn | head -20

echo ""
echo "=== Summary ==="
echo "Total suppressions to resolve: $((TS_EXPECT_ERROR_COUNT + TS_IGNORE_COUNT))"
echo "Run 'npx tsc --noEmit -p tsconfig.app.json' to check for unresolved type errors."
