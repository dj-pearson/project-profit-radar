#!/usr/bin/env node

/**
 * Cloudflare-specific build script
 * Handles dependency installation and build process for Cloudflare Pages
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Starting Cloudflare build process...');

try {
  // Check if package-lock.json exists and remove it to avoid sync issues
  if (fs.existsSync('package-lock.json')) {
    console.log('📦 Removing existing package-lock.json to avoid sync issues...');
    fs.unlinkSync('package-lock.json');
  }

  // Install dependencies with npm install (not npm ci)
  console.log('📥 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });

  // Run the build
  console.log('🔨 Building application...');
  execSync('npm run build', { stdio: 'inherit' });

  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}