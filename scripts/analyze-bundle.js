#!/usr/bin/env node

/**
 * Bundle Analysis Script
 * Analyzes the production build and reports on bundle sizes, dependencies, and optimization opportunities
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '..', 'dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');

// Size thresholds (in bytes)
const THRESHOLDS = {
  MAX_BUNDLE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_CHUNK_SIZE: 500 * 1024, // 500KB
  MAX_IMAGE_SIZE: 200 * 1024, // 200KB
  WARN_CHUNK_SIZE: 300 * 1024, // 300KB
};

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) {
    console.error(`❌ Directory not found: ${dirPath}`);
    console.log('💡 Run "npm run build" first to generate the dist folder');
    process.exit(1);
  }

  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

function analyzeBundle() {
  console.log('📊 Bundle Analysis Report\n');
  console.log('=' .repeat(60));

  // Get all files
  const allFiles = getAllFiles(DIST_DIR);

  // Categorize files
  const jsFiles = allFiles.filter(f => f.endsWith('.js') && !f.endsWith('.map'));
  const cssFiles = allFiles.filter(f => f.endsWith('.css'));
  const imageFiles = allFiles.filter(f => /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(f));
  const fontFiles = allFiles.filter(f => /\.(woff|woff2|ttf|eot)$/i.test(f));

  // Calculate sizes
  const totalSize = allFiles.reduce((sum, file) => sum + getFileSize(file), 0);
  const jsSize = jsFiles.reduce((sum, file) => sum + getFileSize(file), 0);
  const cssSize = cssFiles.reduce((sum, file) => sum + getFileSize(file), 0);
  const imageSize = imageFiles.reduce((sum, file) => sum + getFileSize(file), 0);
  const fontSize = fontFiles.reduce((sum, file) => sum + getFileSize(file), 0);

  // Summary
  console.log('\n📦 Bundle Summary:');
  console.log(`   Total Bundle Size: ${formatBytes(totalSize)}`);
  console.log(`   JavaScript:        ${formatBytes(jsSize)} (${jsFiles.length} files)`);
  console.log(`   CSS:               ${formatBytes(cssSize)} (${cssFiles.length} files)`);
  console.log(`   Images:            ${formatBytes(imageSize)} (${imageFiles.length} files)`);
  console.log(`   Fonts:             ${formatBytes(fontSize)} (${fontFiles.length} files)`);

  // Check against thresholds
  console.log('\n🎯 Threshold Analysis:');
  
  let hasIssues = false;

  if (totalSize > THRESHOLDS.MAX_BUNDLE_SIZE) {
    console.log(`   ❌ Total bundle exceeds ${formatBytes(THRESHOLDS.MAX_BUNDLE_SIZE)}`);
    hasIssues = true;
  } else {
    console.log(`   ✅ Total bundle size is acceptable`);
  }

  // Analyze individual JS chunks
  console.log('\n📄 JavaScript Chunks:');
  
  const sortedJsFiles = jsFiles
    .map(file => ({
      name: path.basename(file),
      path: file,
      size: getFileSize(file)
    }))
    .sort((a, b) => b.size - a.size);

  sortedJsFiles.forEach((file, index) => {
    if (index < 10 || file.size > THRESHOLDS.WARN_CHUNK_SIZE) {
      const status = file.size > THRESHOLDS.MAX_CHUNK_SIZE ? '❌' :
                     file.size > THRESHOLDS.WARN_CHUNK_SIZE ? '⚠️' : '✅';
      console.log(`   ${status} ${file.name.padEnd(50)} ${formatBytes(file.size)}`);
      
      if (file.size > THRESHOLDS.MAX_CHUNK_SIZE) {
        hasIssues = true;
      }
    }
  });

  if (sortedJsFiles.length > 10) {
    console.log(`   ... and ${sortedJsFiles.length - 10} more files`);
  }

  // Analyze images
  if (imageFiles.length > 0) {
    console.log('\n🖼️  Images:');
    
    const sortedImages = imageFiles
      .map(file => ({
        name: path.basename(file),
        size: getFileSize(file)
      }))
      .sort((a, b) => b.size - a.size);

    sortedImages.slice(0, 5).forEach(file => {
      const status = file.size > THRESHOLDS.MAX_IMAGE_SIZE ? '⚠️' : '✅';
      console.log(`   ${status} ${file.name.padEnd(50)} ${formatBytes(file.size)}`);
      
      if (file.size > THRESHOLDS.MAX_IMAGE_SIZE) {
        console.log(`       💡 Consider compressing or converting to WebP/AVIF`);
      }
    });

    if (sortedImages.length > 5) {
      console.log(`   ... and ${sortedImages.length - 5} more images`);
    }
  }

  // Recommendations
  console.log('\n💡 Recommendations:');
  
  if (hasIssues) {
    console.log('   1. Run "npm run build:analyze" to visualize bundle composition');
    console.log('   2. Consider code-splitting large chunks with dynamic imports');
    console.log('   3. Review and lazy-load heavy features (PDF, Excel, Charts)');
    console.log('   4. Check for duplicate dependencies in the bundle');
  } else {
    console.log('   ✅ Bundle is well optimized!');
    console.log('   💡 Still consider running "npm run build:analyze" for detailed insights');
  }

  // Check if stats.html exists
  const statsPath = path.join(DIST_DIR, 'stats.html');
  if (fs.existsSync(statsPath)) {
    console.log(`\n📊 Visual bundle analysis available at: ${statsPath}`);
    console.log('   Open this file in a browser to see detailed composition');
  }

  console.log('\n' + '='.repeat(60));

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalSize,
      jsSize,
      cssSize,
      imageSize,
      fontSize,
      fileCount: {
        js: jsFiles.length,
        css: cssFiles.length,
        images: imageFiles.length,
        fonts: fontFiles.length
      }
    },
    largestChunks: sortedJsFiles.slice(0, 10).map(f => ({
      name: f.name,
      size: f.size,
      sizeFormatted: formatBytes(f.size)
    })),
    thresholds: {
      passed: !hasIssues,
      maxBundleSize: THRESHOLDS.MAX_BUNDLE_SIZE,
      maxChunkSize: THRESHOLDS.MAX_CHUNK_SIZE
    }
  };

  const reportPath = path.join(DIST_DIR, 'bundle-analysis.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Detailed report saved to: ${reportPath}`);

  // Exit with error if issues found
  if (hasIssues) {
    console.log('\n⚠️  Bundle optimization needed!');
    process.exit(1);
  } else {
    console.log('\n✅ Bundle analysis complete!');
    process.exit(0);
  }
}

// Run analysis
analyzeBundle();
