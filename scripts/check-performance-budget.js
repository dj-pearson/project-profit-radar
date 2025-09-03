#!/usr/bin/env node

/**
 * Performance Budget Checker for BuildDesk
 * Validates build outputs against performance budgets
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Performance budget thresholds
const performanceBudget = {
  // Bundle sizes (in bytes)
  maxBundleSize: 1000 * 1024,     // 1MB total
  maxChunkSize: 300 * 1024,       // 300KB per chunk
  maxAssetSize: 500 * 1024,       // 500KB per asset
  
  // Resource counts
  maxJSFiles: 15,
  maxCSSFiles: 5,
  maxImageFiles: 20,
  
  // Critical metrics
  maxLCP: 2500,     // ms
  maxCLS: 0.1,      // score
  maxFID: 100,      // ms
  maxINP: 200,      // ms
  maxTTFB: 800      // ms
};

function checkBundleSize() {
  const distPath = path.join(__dirname, '..', 'dist');
  
  if (!fs.existsSync(distPath)) {
    console.log('❌ No dist folder found. Run npm run build first.');
    return false;
  }

  console.log('📦 Bundle Size Analysis');
  console.log('='.repeat(40));

  let totalSize = 0;
  let violations = [];
  let jsFiles = 0;
  let cssFiles = 0;
  let imageFiles = 0;

  function analyzeDirectory(dirPath, prefix = '') {
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        analyzeDirectory(filePath, prefix + file + '/');
      } else {
        const size = stat.size;
        totalSize += size;
        const relativePath = prefix + file;
        
        // Count file types
        if (file.endsWith('.js')) jsFiles++;
        if (file.endsWith('.css')) cssFiles++;
        if (/\.(png|jpg|jpeg|webp|avif|svg|ico|gif)$/.test(file)) imageFiles++;
        
        // Check individual file size
        if (size > performanceBudget.maxAssetSize) {
          violations.push(`📄 Large asset: ${relativePath} (${(size / 1024).toFixed(1)}KB)`);
        }
        
        // Check chunk size for JS files
        if (file.endsWith('.js') && size > performanceBudget.maxChunkSize) {
          violations.push(`📦 Large chunk: ${relativePath} (${(size / 1024).toFixed(1)}KB)`);
        }
        
        // Log significant files
        if (size > 50 * 1024) { // >50KB
          const status = size > performanceBudget.maxAssetSize ? '❌' : '✅';
          console.log(`  ${status} ${relativePath}: ${(size / 1024).toFixed(1)}KB`);
        }
      }
    });
  }

  analyzeDirectory(distPath);

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
  if (violations.length > 0) {
    console.log('❌ Performance Budget Violations:');
    violations.forEach(violation => console.log(`  ${violation}`));
    console.log('');
    return false;
  } else {
    console.log('✅ All performance budgets passed!');
    console.log('');
    return true;
  }
}

function generateOptimizationSuggestions(passed) {
  console.log('💡 Performance Optimization Suggestions:');
  console.log('');

  if (!passed) {
    console.log('🔧 Immediate Actions:');
    console.log('  1. Run npm run build:analyze to see bundle composition');
    console.log('  2. Implement route-based code splitting for large pages');
    console.log('  3. Move heavy libraries to separate chunks');
    console.log('  4. Consider lazy loading non-critical features');
    console.log('  5. Compress or optimize large assets');
    console.log('');
  }

  console.log('🚀 Advanced Optimizations:');
  console.log('  1. 🖼️  Convert images to WebP/AVIF formats');
  console.log('  2. 📦 Enable Brotli compression on CDN');
  console.log('  3. ⚡ Implement critical CSS extraction');
  console.log('  4. 🔄 Add service worker for caching');
  console.log('  5. 📱 Implement adaptive loading for slow connections');
  console.log('  6. 🎯 Set up performance monitoring alerts');
  console.log('  7. 📊 Configure Real User Monitoring (RUM)');
  console.log('  8. 🔍 Add performance budgets to CI/CD pipeline');
  console.log('');

  console.log('📈 SEO Impact:');
  console.log('  🎯 Page speed is a confirmed Google ranking factor');
  console.log('  📱 Mobile performance affects mobile-first indexing');
  console.log('  ⚡ Fast pages have lower bounce rates');
  console.log('  🚀 Better UX leads to higher conversion rates');
  console.log('  📊 Core Web Vitals impact search visibility');
}

function main() {
  console.log('🚀 BuildDesk Performance Budget Check');
  console.log('=====================================');
  console.log('');

  const passed = checkBundleSize();
  generateOptimizationSuggestions(passed);
  
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

// Run if this is the main module  
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
