// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add alias support for src directory
config.resolver.alias = {
  '@': path.resolve(__dirname, 'src'),
};

// Exclude web-only files and directories from mobile builds
config.resolver.blacklistRE = /(\/src\/pages\/)|(\/src\/App\.tsx$)|(react-router-dom)/;

// Use platform-specific extensions
config.resolver.sourceExts = ['expo.tsx', 'expo.ts', 'expo.js', 'tsx', 'ts', 'js', 'json'];

module.exports = config;
