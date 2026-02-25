#!/usr/bin/env node
/**
 * Bundle Size Performance Budget Checker
 * Parses Vite build output and enforces size limits.
 *
 * Usage: npm run build && node scripts/check-bundle-size.js
 * Exit code 1 if budget exceeded.
 */

import fs from 'fs';
import path from 'path';

const BUDGET = {
  maxTotalGzipped: 4 * 1024 * 1024, // 4MB estimated gzipped (large construction app with 3D, xlsx, html2canvas)
  maxChunkSize: 900 * 1024, // 900KB raw per chunk (accommodates Three.js/3D viewer)
};

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${bytes} B`;
}

function parseSizeString(sizeStr) {
  const match = sizeStr.trim().match(/([\d.]+)\s*(kB|MB|B)/i);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === 'mb') return value * 1024 * 1024;
  if (unit === 'kb') return value * 1024;
  return value;
}

function scanDistFolder() {
  const distDir = path.join(process.cwd(), 'dist');
  const assetsDir = path.join(distDir, 'assets');

  if (!fs.existsSync(assetsDir)) {
    console.error('❌ dist/assets directory not found. Run npm run build first.');
    process.exit(1);
  }

  const files = fs.readdirSync(assetsDir);
  const chunks = [];
  let totalSize = 0;

  for (const file of files) {
    if (!file.endsWith('.js') && !file.endsWith('.css')) continue;
    const filePath = path.join(assetsDir, file);
    const stat = fs.statSync(filePath);
    const size = stat.size;
    totalSize += size;
    chunks.push({ name: file, size });
  }

  chunks.sort((a, b) => b.size - a.size);
  return { chunks, totalSize };
}

function main() {
  console.log('\n📊 Bundle Size Performance Budget Check\n');
  console.log('═'.repeat(70));

  const { chunks, totalSize } = scanDistFolder();

  // Estimate gzipped size (~30% of raw)
  const estimatedGzipped = totalSize * 0.3;

  let violations = 0;

  // Print chunk table
  console.log(`${'Chunk'.padEnd(55)} ${'Size'.padStart(12)}`);
  console.log('─'.repeat(70));

  for (const chunk of chunks.slice(0, 20)) {
    const sizeStr = formatSize(chunk.size);
    const overBudget = chunk.size > BUDGET.maxChunkSize;
    const marker = overBudget ? ' ⚠️  OVER BUDGET' : '';
    if (overBudget) violations++;
    console.log(`${chunk.name.padEnd(55)} ${sizeStr.padStart(12)}${marker}`);
  }

  if (chunks.length > 20) {
    console.log(`  ... and ${chunks.length - 20} more chunks`);
  }

  console.log('─'.repeat(70));
  console.log(`${'Total (raw)'.padEnd(55)} ${formatSize(totalSize).padStart(12)}`);
  console.log(`${'Total (est. gzipped)'.padEnd(55)} ${formatSize(estimatedGzipped).padStart(12)}`);
  console.log('═'.repeat(70));

  // Check budgets
  console.log('\n📋 Budget Results:\n');

  const totalOk = estimatedGzipped <= BUDGET.maxTotalGzipped;
  console.log(`  Total gzipped: ${formatSize(estimatedGzipped)} / ${formatSize(BUDGET.maxTotalGzipped)} ${totalOk ? '✅ PASS' : '❌ FAIL'}`);
  if (!totalOk) violations++;

  const oversizedChunks = chunks.filter(c => c.size > BUDGET.maxChunkSize);
  const chunkOk = oversizedChunks.length === 0;
  console.log(`  Chunk size limit: ${oversizedChunks.length} chunks over ${formatSize(BUDGET.maxChunkSize)} ${chunkOk ? '✅ PASS' : '⚠️  WARNING'}`);

  console.log('');

  if (violations > 0) {
    console.log(`❌ Performance budget check FAILED with ${violations} violation(s)\n`);
    // Exit with warning but don't fail CI for chunk warnings (only total)
    if (!totalOk) process.exit(1);
  } else {
    console.log('✅ All performance budgets passed!\n');
  }
}

main();
