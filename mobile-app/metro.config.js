const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for path aliases
config.resolver.alias = {
  '@': path.resolve(__dirname, 'src'),
  '@/components': path.resolve(__dirname, 'src/components'),
  '@/contexts': path.resolve(__dirname, 'src/contexts'),
  '@/hooks': path.resolve(__dirname, 'src/hooks'),
  '@/services': path.resolve(__dirname, 'src/services'),
  '@/utils': path.resolve(__dirname, 'src/utils'),
  '@/types': path.resolve(__dirname, 'src/types'),
  '@/app': path.resolve(__dirname, 'src/app'),
};

// Ensure we only bundle mobile-specific files
config.resolver.sourceExts = [...config.resolver.sourceExts, 'tsx', 'ts', 'jsx', 'js'];

// Exclude web-specific modules
config.resolver.blacklistRE = /node_modules\/.*\/web\/.*/;

module.exports = config;
