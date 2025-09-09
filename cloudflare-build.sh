#!/bin/bash

# Cloudflare build script to handle dependency conflicts
echo "Starting build with dependency conflict handling..."

# Use npm install with force flag instead of npm ci
npm install --force

# Run the build
npm run build

echo "Build completed successfully"