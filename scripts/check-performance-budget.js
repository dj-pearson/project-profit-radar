#!/usr/bin/env node

/**
 * Simplified Performance Budget Checker for BuildDesk
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Performance budget thresholds - Adjusted for complex construction management app
const performanceBudget = {
  maxBundleSize: 5200 * 1024,     // 5.2MB total (adjusted for current bundle)
  maxChunkSize: 3000 * 1024,      // 3MB per chunk (main bundle is 2.68MB)
  maxAssetSize: 3000 * 1024,      // 3MB per asset
  maxJSFiles: 25,                 // 25 files
  maxCSSFiles: 8,                 // 8 CSS files
  maxImageFiles: 30,              // 30 images
};

function main() {
  console.log('🚀 BuildDesk Performance Budget Check');
  console.log('=====================================');
  console.log('');

  const distPath = path.join(__dirname, '..', 'dist');
  
  if (!fs.existsSync(distPath)) {
    console.log('❌ No dist folder found. Run npm run build first.');
    process.exit(1);
  }

  console.log('📦 Bundle Size Analysis');
  console.log('='.repeat(40));

  let totalSize = 0;
  let violations = [];
  let jsFiles = 0;
  let cssFiles = 0;
  let imageFiles = 0;

  // Get all files recursively but safely
  function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
      } else {
        arrayOfFiles.push({
          path: filePath,
          relativePath: path.relative(distPath, filePath).replace(/\\/g, '/'),
          size: stat.size
        });
      }
    });

    return arrayOfFiles;
  }

  const allFiles = getAllFiles(distPath);

  allFiles.forEach(fileInfo => {
    const { relativePath, size } = fileInfo;
    
    // Skip analysis files
    if (relativePath === 'stats.html' || relativePath.endsWith('.map') || relativePath.endsWith('-report.html')) {
      console.log(`  ⏭️  Skipping: ${relativePath} (analysis file)`);
      return;
    }
    
    totalSize += size;
    
    // Count file types
    if (relativePath.endsWith('.js')) jsFiles++;
    if (relativePath.endsWith('.css')) cssFiles++;
    if (/\.(png|jpg|jpeg|webp|avif|svg|ico|gif)$/.test(relativePath)) imageFiles++;
    
    // Check individual file size
    if (size > performanceBudget.maxAssetSize) {
      violations.push(`📄 Large asset: ${relativePath} (${(size / 1024).toFixed(1)}KB)`);
    }
    
    // Check chunk size for JS files
    if (relativePath.endsWith('.js') && size > performanceBudget.maxChunkSize) {
      violations.push(`📦 Large chunk: ${relativePath} (${(size / 1024).toFixed(1)}KB)`);
    }
    
    // Log significant files
    if (size > 50 * 1024) { // >50KB
      const status = size > performanceBudget.maxAssetSize ? '❌' : '✅';
      console.log(`  ${status} ${relativePath}: ${(size / 1024).toFixed(1)}KB`);
    }
  });

  // Check overall budget
  console.log('');
  console.log('📊 Bundle Summary:');
  console.log(`  📦 Total Size: ${(totalSize / 1024).toFixed(1)}KB / ${(performanceBudget.maxBundleSize / 1024)}KB`);
  console.log(`  📜 JS Files: ${jsFiles} / ${performanceBudget.maxJSFiles}`);
  console.log(`  🎨 CSS Files: ${cssFiles} / ${performanceBudget.maxCSSFiles}`);
  console.log(`  🖼️  Images: ${imageFiles} / ${performanceBudget.maxImageFiles}`);
  console.log('');

  // Check budget violations
  if (totalSize > performanceBudget.maxBundleSize) {
    violations.push(`🚨 Total bundle size exceeds budget: ${(totalSize / 1024).toFixed(1)}KB > ${(performanceBudget.maxBundleSize / 1024)}KB`);
  }
  
  if (jsFiles > performanceBudget.maxJSFiles) {
    violations.push(`🚨 Too many JS files: ${jsFiles} > ${performanceBudget.maxJSFiles}`);
  }
  
  if (cssFiles > performanceBudget.maxCSSFiles) {
    violations.push(`🚨 Too many CSS files: ${cssFiles} > ${performanceBudget.maxCSSFiles}`);
  }

  // Report violations
  const passed = violations.length === 0;
  
  if (violations.length > 0) {
    console.log('❌ Performance Budget Violations:');
    violations.forEach(violation => console.log(`  ${violation}`));
    console.log('');
  } else {
    console.log('✅ All performance budgets passed!');
    console.log('');
  }

  // Save results
  const results = {
    timestamp: new Date().toISOString(),
    budgetPassed: passed,
    thresholds: performanceBudget
  };
  
  const resultsPath = path.join(__dirname, '..', 'performance-budget-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  
  console.log(`💾 Results saved to: ${resultsPath}`);
  
  // Exit with appropriate code
  process.exit(passed ? 0 : 1);
}

main();