#!/usr/bin/env node

/**
 * Simple test of performance budget check
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting BuildDesk Performance Budget Check');
console.log('=====================================');

const distPath = path.join(__dirname, 'dist');
console.log('📂 Checking dist path:', distPath);

if (!fs.existsSync(distPath)) {
  console.log('❌ No dist folder found');
  process.exit(1);
}

console.log('📦 Analyzing bundle files...');

function analyzeDirectory(dirPath, prefix = '') {
  const files = fs.readdirSync(dirPath);
  let totalSize = 0;
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      totalSize += analyzeDirectory(filePath, prefix + file + '/');
    } else {
      const size = stat.size;
      totalSize += size;
      const relativePath = prefix + file;
      
      if (size > 50 * 1024) { // >50KB
        console.log(`  📄 ${relativePath}: ${(size / 1024).toFixed(1)}KB`);
      }
    }
  });
  
  return totalSize;
}

const totalSize = analyzeDirectory(distPath);

console.log(`📊 Total bundle size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);

// Check against 5MB budget
const passed = totalSize < (5 * 1024 * 1024);
console.log(passed ? '✅ Budget passed!' : '❌ Budget exceeded!');

process.exit(passed ? 0 : 1);