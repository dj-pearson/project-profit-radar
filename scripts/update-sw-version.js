/**
 * Update Service Worker Version
 *
 * Injects a unique build version into the service worker file
 * This ensures cache invalidation on each deployment
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Use git commit hash + timestamp for unique, traceable versions
let gitHash = '';
try {
  gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
} catch {
  gitHash = 'unknown';
}
const BUILD_VERSION = `${gitHash}-${Date.now()}`;
const SW_PATH = join(process.cwd(), 'dist', 'sw.js');

try {
  // Read the built service worker file
  let swContent = readFileSync(SW_PATH, 'utf-8');
  
  // Replace the placeholder with actual build version
  swContent = swContent.replace(/__BUILD_VERSION__/g, BUILD_VERSION);
  
  // Write back to file
  writeFileSync(SW_PATH, swContent, 'utf-8');
  
  console.log(`✅ Service Worker version updated: ${BUILD_VERSION}`);
  console.log(`📦 File: dist/sw.js`);
} catch (error) {
  console.error('❌ Failed to update service worker version:', error.message);
  process.exit(1);
}

