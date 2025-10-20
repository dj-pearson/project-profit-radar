import { getDefaultConfig } from 'expo/metro-config.js';

const config = getDefaultConfig(import.meta.url);

// Add support for TypeScript and JSX
config.resolver.sourceExts.push('tsx', 'ts', 'jsx', 'js');

// Add support for web extensions
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Add alias support for src directory
config.resolver.alias = {
  '@': './src',
};

export default config;
