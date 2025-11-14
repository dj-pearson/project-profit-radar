#!/usr/bin/env node
/**
 * Copy index.html to 404.html for SPA routing on Cloudflare Pages
 *
 * Cloudflare Pages automatically serves 404.html when a file is not found.
 * By making 404.html a copy of index.html, we enable client-side routing
 * while ensuring static assets are served correctly.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distPath, 'index.html');
const notFoundPath = path.join(distPath, '404.html');

try {
  // Check if index.html exists
  if (!fs.existsSync(indexPath)) {
    console.error('❌ Error: dist/index.html not found');
    process.exit(1);
  }

  // Copy index.html to 404.html
  fs.copyFileSync(indexPath, notFoundPath);

  console.log('✅ Created 404.html for SPA routing');
  console.log('📄 Copied from:', indexPath);
  console.log('📄 Copied to:', notFoundPath);
} catch (error) {
  console.error('❌ Error creating 404.html:', error.message);
  process.exit(1);
}
