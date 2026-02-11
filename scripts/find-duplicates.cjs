#!/usr/bin/env node
/**
 * Duplicate File Detector for BuildDesk
 *
 * Scans src/ for:
 *   1. Same base name with .ts AND .tsx in the same directory (import ambiguity)
 *   2. Same filename in different directories (potential dead copies)
 *
 * Usage:
 *   node scripts/find-duplicates.js            # Report only
 *   node scripts/find-duplicates.js --check    # Exit code 1 if same-dir duplicates found (CI mode)
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build']);

// ──────────────────────────────────────────────
// Collect every .ts / .tsx file under src/
// ──────────────────────────────────────────────
function walk(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      results.push(full);
    }
  }
  return results;
}

// ──────────────────────────────────────────────
// 1. Same-directory extension conflicts (.ts + .tsx)
//    These cause TypeScript import ambiguity.
// ──────────────────────────────────────────────
function findExtensionConflicts(files) {
  const byDirAndBase = new Map(); // key = dir + baseName (no ext)

  for (const f of files) {
    const dir = path.dirname(f);
    const ext = path.extname(f);
    const base = path.basename(f, ext);
    const key = `${dir}${path.sep}${base}`;

    if (!byDirAndBase.has(key)) byDirAndBase.set(key, []);
    byDirAndBase.get(key).push(f);
  }

  const conflicts = [];
  for (const [, group] of byDirAndBase) {
    if (group.length > 1) {
      conflicts.push(group.map(f => path.relative(SRC_DIR, f)));
    }
  }
  return conflicts;
}

// ──────────────────────────────────────────────
// 2. Same filename in different directories
// ──────────────────────────────────────────────
function findCrossDirDuplicates(files) {
  const byName = new Map(); // key = filename

  for (const f of files) {
    const name = path.basename(f);
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(f);
  }

  const duplicates = [];
  for (const [name, group] of byName) {
    if (group.length > 1) {
      duplicates.push({
        name,
        paths: group.map(f => path.relative(SRC_DIR, f)),
      });
    }
  }
  return duplicates.sort((a, b) => a.name.localeCompare(b.name));
}

// ──────────────────────────────────────────────
// 3. Identify which file is likely the "dead" copy
//    Heuristic: the one NOT imported anywhere else wins.
// ──────────────────────────────────────────────
function countImports(relPath, allFiles) {
  // Convert to an import-style path (forward slashes, no extension)
  const ext = path.extname(relPath);
  const importPath = relPath.replace(/\\/g, '/').replace(ext, '');
  let count = 0;

  for (const f of allFiles) {
    try {
      const content = fs.readFileSync(f, 'utf-8');
      // Check for @ alias or relative imports that resolve to this file
      if (content.includes(importPath) || content.includes(path.basename(relPath, ext))) {
        count++;
      }
    } catch {
      // skip unreadable files
    }
  }
  // Subtract 1 because the file itself may self-reference
  return Math.max(0, count - 1);
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────
const checkMode = process.argv.includes('--check');

console.log('='.repeat(60));
console.log('  BuildDesk Duplicate File Report');
console.log('='.repeat(60));
console.log();

const allFiles = walk(SRC_DIR);
console.log(`Scanned ${allFiles.length} TypeScript files in src/\n`);

// ── Extension conflicts ──
const conflicts = findExtensionConflicts(allFiles);

if (conflicts.length > 0) {
  console.log('--- SAME-DIRECTORY EXTENSION CONFLICTS (import ambiguity) ---');
  console.log('These files share the same name in the same directory.');
  console.log('TypeScript may resolve imports unpredictably.\n');

  for (const group of conflicts) {
    console.log(`  CONFLICT:`);
    for (const f of group) {
      const fullPath = path.join(SRC_DIR, f);
      const stats = fs.statSync(fullPath);
      const lines = fs.readFileSync(fullPath, 'utf-8').split('\n').length;
      console.log(`    ${f}  (${lines} lines, ${(stats.size / 1024).toFixed(1)} KB)`);
    }
    console.log();
  }
} else {
  console.log('--- No same-directory extension conflicts found. ---\n');
}

// ── Cross-directory duplicates ──
const crossDirDups = findCrossDirDuplicates(allFiles);

if (crossDirDups.length > 0) {
  console.log('--- CROSS-DIRECTORY DUPLICATES (same filename, different dirs) ---');
  console.log(`Found ${crossDirDups.length} filenames that appear in multiple directories.\n`);

  for (const dup of crossDirDups) {
    console.log(`  ${dup.name}:`);
    for (const p of dup.paths) {
      const fullPath = path.join(SRC_DIR, p);
      const stats = fs.statSync(fullPath);
      const lines = fs.readFileSync(fullPath, 'utf-8').split('\n').length;
      console.log(`    ${p}  (${lines} lines, ${(stats.size / 1024).toFixed(1)} KB)`);
    }
    console.log();
  }
} else {
  console.log('--- No cross-directory duplicates found. ---\n');
}

// ── Summary ──
console.log('='.repeat(60));
console.log(`  Extension conflicts: ${conflicts.length}`);
console.log(`  Cross-dir duplicates: ${crossDirDups.length}`);
console.log('='.repeat(60));

if (checkMode && conflicts.length > 0) {
  console.log('\nCI CHECK FAILED: Same-directory extension conflicts must be resolved.');
  process.exit(1);
}
