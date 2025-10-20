import { getDefaultConfig } from 'expo/metro-config.js';

const config = getDefaultConfig(__dirname);

// Add alias support for src directory
config.resolver.alias = {
  '@': './src',
};

export default config;
