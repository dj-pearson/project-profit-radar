#!/usr/bin/env node

/**
 * Edge Function Audit Script
 *
 * Compares edge functions invoked in the frontend/services code against
 * what actually exists in supabase/functions/. Reports:
 *
 * 1. MISSING: Functions invoked in code but no directory in supabase/functions/
 * 2. ORPHANED: Directories in supabase/functions/ never invoked by any code
 * 3. EMPTY/BROKEN: Function directories missing an index.ts entry point
 * 4. INVOCATION MAP: Every function call with file + line number
 *
 * Usage: node scripts/audit-edge-functions.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FUNCTIONS_DIR = path.join(ROOT, 'supabase', 'functions');
const SRC_DIR = path.join(ROOT, 'src');
const SUPABASE_FUNCTIONS_SRC = FUNCTIONS_DIR; // edge functions can call each other

// ─── Helpers ────────────────────────────────────────────────────────

function walkDir(dir, extensions) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules, .git, dist, etc.
      if (['node_modules', '.git', 'dist', 'build', '.next', 'android', 'ios', 'mobile-native'].includes(entry.name)) continue;
      results = results.concat(walkDir(fullPath, extensions));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (extensions.includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function getExistingFunctions() {
  if (!fs.existsSync(FUNCTIONS_DIR)) {
    console.error(`ERROR: ${FUNCTIONS_DIR} does not exist`);
    process.exit(1);
  }
  const entries = fs.readdirSync(FUNCTIONS_DIR, { withFileTypes: true });
  const functions = {};
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === '_shared' || entry.name === 'node_modules') continue;

    const dirPath = path.join(FUNCTIONS_DIR, entry.name);
    const indexTs = path.join(dirPath, 'index.ts');
    const indexJs = path.join(dirPath, 'index.js');
    const hasEntry = fs.existsSync(indexTs) || fs.existsSync(indexJs);

    let entrySize = 0;
    if (fs.existsSync(indexTs)) {
      entrySize = fs.statSync(indexTs).size;
    } else if (fs.existsSync(indexJs)) {
      entrySize = fs.statSync(indexJs).size;
    }

    functions[entry.name] = {
      path: dirPath,
      hasEntry,
      entrySize,
    };
  }
  return functions;
}

function findInvocations(files) {
  const invocations = {}; // functionName -> [{ file, line, pattern, snippet }]

  // Patterns to match
  const patterns = [
    // supabase.functions.invoke('name' or "name" or `name`)
    {
      regex: /(?:supabase|supabaseClient|client)\.functions\.invoke\(\s*['"`]([^'"`]+)['"`]/g,
      type: 'supabase.functions.invoke',
    },
    // getEdgeFunctionUrl('name') or getEdgeFunctionUrl("name")
    {
      regex: /getEdgeFunctionUrl\(\s*['"`]([^'"`]+)['"`]/g,
      type: 'getEdgeFunctionUrl',
    },
    // invokeEdgeFunction('name') or invokeEdgeFunction("name")
    {
      regex: /invokeEdgeFunction\(\s*['"`]([^'"`]+)['"`]/g,
      type: 'invokeEdgeFunction',
    },
    // fetch with /functions/v1/name pattern
    {
      regex: /fetch\([^)]*\/functions\/v1\/([a-z0-9_-]+)/g,
      type: 'fetch(/functions/v1/)',
    },
  ];

  for (const filePath of files) {
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }

    const lines = content.split('\n');
    const relPath = path.relative(ROOT, filePath).replace(/\\/g, '/');

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      for (const pattern of patterns) {
        // Reset regex lastIndex
        pattern.regex.lastIndex = 0;
        let match;
        while ((match = pattern.regex.exec(line)) !== null) {
          const funcName = match[1];
          if (!invocations[funcName]) {
            invocations[funcName] = [];
          }
          invocations[funcName].push({
            file: relPath,
            line: lineIdx + 1,
            pattern: pattern.type,
            snippet: line.trim().substring(0, 120),
          });
        }
      }
    }
  }

  return invocations;
}

function checkEntryPointContent(funcInfo) {
  const issues = [];
  const indexPath = path.join(funcInfo.path, 'index.ts');
  if (!fs.existsSync(indexPath)) return issues;

  const content = fs.readFileSync(indexPath, 'utf-8');

  // Check for a valid serve/handler pattern (any of these is acceptable):
  // - Deno.serve()
  // - serve() from std library
  // - export default (modern Supabase edge function pattern)
  const hasServePattern =
    content.includes('Deno.serve') ||
    content.includes('serve(') ||
    /export\s+default\s/.test(content);

  if (!hasServePattern) {
    issues.push('Missing handler: no Deno.serve(), serve(), or export default found');
  }

  // Check if file is suspiciously small (< 100 bytes = probably a stub)
  if (funcInfo.entrySize < 100) {
    issues.push(`Very small file (${funcInfo.entrySize} bytes) - possible stub`);
  }

  return issues;
}

// ─── Main ───────────────────────────────────────────────────────────

function main() {
  console.log('='.repeat(70));
  console.log('  BRIKLY EDGE FUNCTION AUDIT');
  console.log('  ' + new Date().toISOString());
  console.log('='.repeat(70));
  console.log();

  // 1. Get existing functions
  const existingFunctions = getExistingFunctions();
  const existingNames = Object.keys(existingFunctions).sort();
  console.log(`Found ${existingNames.length} edge function directories in supabase/functions/\n`);

  // 2. Find all invocations in source code
  const srcFiles = walkDir(SRC_DIR, ['.ts', '.tsx', '.js', '.jsx']);
  const edgeFuncFiles = walkDir(SUPABASE_FUNCTIONS_SRC, ['.ts', '.js']);
  const allFiles = [...srcFiles, ...edgeFuncFiles];
  console.log(`Scanning ${srcFiles.length} source files + ${edgeFuncFiles.length} edge function files...\n`);

  const invocations = findInvocations(allFiles);
  const invokedNames = Object.keys(invocations).sort();
  console.log(`Found ${invokedNames.length} unique function names invoked in code\n`);

  // 3. MISSING: invoked but no directory
  const missing = invokedNames.filter(name => !existingFunctions[name]);
  console.log('─'.repeat(70));
  console.log(`\n❌ MISSING FUNCTIONS (invoked in code but no supabase/functions/ directory): ${missing.length}\n`);
  if (missing.length === 0) {
    console.log('  None - all invoked functions have a directory!\n');
  } else {
    for (const name of missing) {
      console.log(`  ❌ ${name}`);
      for (const inv of invocations[name]) {
        console.log(`      ├─ ${inv.file}:${inv.line} [${inv.pattern}]`);
      }
      console.log();
    }
  }

  // 4. ORPHANED: directory exists but never invoked
  const orphaned = existingNames.filter(name => !invocations[name]);
  console.log('─'.repeat(70));
  console.log(`\n⚠️  ORPHANED FUNCTIONS (directory exists, never invoked in code): ${orphaned.length}\n`);
  if (orphaned.length === 0) {
    console.log('  None - all directories are referenced in code!\n');
  } else {
    for (const name of orphaned) {
      const info = existingFunctions[name];
      const status = info.hasEntry ? `✓ has index.ts (${info.entrySize}B)` : '✗ NO index.ts';
      console.log(`  ⚠️  ${name}  [${status}]`);
    }
    console.log();
    console.log('  Note: Some orphaned functions may be invoked via webhooks, cron jobs,');
    console.log('  or external services not visible in the source code.\n');
  }

  // 5. EMPTY/BROKEN: directory exists but missing entry point or has issues
  const broken = [];
  for (const name of existingNames) {
    const info = existingFunctions[name];
    const issues = [];
    if (!info.hasEntry) {
      issues.push('Missing index.ts entry point');
    } else {
      issues.push(...checkEntryPointContent(info));
    }
    if (issues.length > 0) {
      broken.push({ name, issues });
    }
  }
  console.log('─'.repeat(70));
  console.log(`\n🔧 BROKEN/SUSPECT FUNCTIONS (missing entry point or structural issues): ${broken.length}\n`);
  if (broken.length === 0) {
    console.log('  None - all function directories look structurally sound!\n');
  } else {
    for (const { name, issues } of broken) {
      console.log(`  🔧 ${name}`);
      for (const issue of issues) {
        console.log(`      └─ ${issue}`);
      }
    }
    console.log();
  }

  // 6. INVOCATION MAP: Full list grouped by function
  console.log('─'.repeat(70));
  console.log(`\n📋 FULL INVOCATION MAP (${invokedNames.length} functions, sorted alphabetically)\n`);
  for (const name of invokedNames) {
    const exists = existingFunctions[name] ? '✅' : '❌';
    const callCount = invocations[name].length;
    console.log(`  ${exists} ${name} (${callCount} call${callCount > 1 ? 's' : ''})`);
    for (const inv of invocations[name]) {
      console.log(`      ${inv.file}:${inv.line}`);
    }
  }

  // 7. Summary
  console.log('\n' + '='.repeat(70));
  console.log('  SUMMARY');
  console.log('='.repeat(70));
  console.log(`  Edge function directories:  ${existingNames.length}`);
  console.log(`  Unique functions invoked:   ${invokedNames.length}`);
  console.log(`  ❌ Missing (no directory):   ${missing.length}`);
  console.log(`  ⚠️  Orphaned (never called):  ${orphaned.length}`);
  console.log(`  🔧 Broken/suspect:           ${broken.length}`);
  console.log(`  ✅ Matched & healthy:         ${invokedNames.length - missing.length}`);
  console.log('='.repeat(70));

  // Exit with error code if there are missing functions
  if (missing.length > 0) {
    console.log(`\n⛔ ${missing.length} function(s) are invoked in code but have no implementation!`);
    process.exit(1);
  }
}

main();
